/**
 * Phase 0 spike 1: how long can a hook be held open, and what does Claude
 * Code do when it gives up?
 *
 * Holds every PermissionRequest (and, with HOLD_STOP=1, every Stop) hook for
 * HOLD_SECONDS, then answers. Logs when the hook arrived, when it was
 * answered, and whether Claude Code closed the connection first.
 *
 *   CACP_HOOK_SECRET=... HOLD_SECONDS=120 ANSWER=allow pnpm spike:held-hook
 *
 * ANSWER: allow | deny | none   (PermissionRequest)
 * HOLD_STOP=1 also holds Stop and answers with decision "block" + STOP_REASON.
 */
import { createServer } from "node:http";
import { loadConfig } from "../src/config.ts";
import { HOOK_PATH_PREFIX, SECRET_HEADER } from "../src/hook-server.ts";

const config = loadConfig();
const holdMs = Number(process.env.HOLD_SECONDS ?? 60) * 1000;
const answer = process.env.ANSWER ?? "allow";
const holdStop = process.env.HOLD_STOP === "1";
const stopReason = process.env.STOP_REASON ?? "Spike: list the files in the current directory, then stop.";

const now = () => new Date().toISOString();
let stopBlocks = 0;

createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.startsWith(HOOK_PATH_PREFIX)) return void res.writeHead(404).end();
  if (req.headers[SECRET_HEADER] !== config.CACP_HOOK_SECRET) return void res.writeHead(401).end();

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
  const event = String(input.hook_event_name ?? req.url.slice(HOOK_PATH_PREFIX.length));
  const held = event === "PermissionRequest" || (holdStop && event === "Stop");

  if (!held) {
    console.log(`${now()} ${event} (not held)`);
    return void res.writeHead(200).end();
  }

  const started = Date.now();
  let closedEarly = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      closedEarly = true;
      console.log(
        `${now()} ${event} CLOSED BY CLAUDE CODE after ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    }
  });

  console.log(`${now()} ${event} held for ${holdMs / 1000}s  keys=${Object.keys(input).join(",")}`);
  if (event === "PermissionRequest") {
    console.log(`  tool=${String(input.tool_name)} input=${JSON.stringify(input.tool_input)?.slice(0, 200)}`);
  }
  await new Promise((r) => setTimeout(r, holdMs));
  if (closedEarly) return;

  let output: Record<string, unknown> | undefined;
  if (event === "PermissionRequest" && answer !== "none") {
    output = {
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision:
          answer === "deny"
            ? { behavior: "deny", message: "Denied remotely (spike)" }
            : { behavior: "allow" },
      },
    };
  } else if (event === "Stop" && stopBlocks < 1 && input.stop_hook_active !== true) {
    // Block once only, so the spike cannot loop.
    stopBlocks++;
    output = { decision: "block", reason: stopReason };
  }

  console.log(`${now()} ${event} answered after ${((Date.now() - started) / 1000).toFixed(1)}s: ${JSON.stringify(output ?? null)}`);
  if (output) res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(output));
  else res.writeHead(200).end();
}).listen(config.CACP_HOOK_PORT, "127.0.0.1", () =>
  console.log(`held-hook spike on 127.0.0.1:${config.CACP_HOOK_PORT} hold=${holdMs / 1000}s answer=${answer} holdStop=${holdStop}`),
);
