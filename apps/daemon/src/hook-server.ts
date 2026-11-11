import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { normalizeHook, type NormalizedHook } from "@cacp/protocol";
import type { Outbox, OutboxEvent } from "./outbox.ts";

export const HOOK_PATH_PREFIX = "/cacp-hook/";
export const SECRET_HEADER = "x-cacp-secret";

/**
 * Called for hooks that may be answered. Return a Claude Code hook output
 * object to answer, or undefined to give no decision (Claude Code then falls
 * back to its normal local behaviour).
 */
export type DecisionHandler = (
  hook: NormalizedHook,
  event: OutboxEvent,
) => Promise<Record<string, unknown> | undefined>;

export interface HookServerOptions {
  secret: string;
  outbox: Outbox;
  onEvent?: (event: OutboxEvent) => void;
  /** Only consulted for PermissionRequest and Stop. */
  decide?: DecisionHandler;
}

const DECIDABLE = new Set(["PermissionRequest", "Stop"]);
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function secretsMatch(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function send(res: ServerResponse, status: number, body?: unknown): void {
  if (body === undefined) {
    res.writeHead(status).end();
    return;
  }
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

/**
 * Receives Claude Code hooks on localhost. Observation hooks are answered
 * with an empty 200 immediately so Claude Code is never slowed down.
 */
export function createHookServer(opts: HookServerOptions): Server {
  return createServer(async (req, res) => {
    try {
      if (req.method !== "POST" || !req.url?.startsWith(HOOK_PATH_PREFIX)) return send(res, 404);
      const header = req.headers[SECRET_HEADER];
      if (!secretsMatch(Array.isArray(header) ? header[0] : header, opts.secret)) {
        return send(res, 401);
      }

      let raw: unknown;
      try {
        raw = JSON.parse(await readBody(req));
      } catch {
        // A 2xx with an empty body is "success, no decision" to Claude Code.
        return send(res, 200);
      }

      const hook = normalizeHook(raw);
      if (!hook) return send(res, 200);

      const event = opts.outbox.append({
        type: hook.type,
        sessionId: hook.sessionId,
        agentId: hook.agentId,
        agentType: hook.agentType,
        stopReason: hook.stopReason,
        payload: hook.payload,
      });
      opts.onEvent?.(event);

      const name = String(hook.payload.hook_event_name);
      if (opts.decide && DECIDABLE.has(name)) {
        const output = await opts.decide(hook, event);
        return send(res, 200, output);
      }
      return send(res, 200);
    } catch {
      // Never surface an error to Claude Code as a blocking failure.
      if (!res.headersSent) send(res, 200);
    }
  });
}
