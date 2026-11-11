import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { COMMAND_ONLY_HOOK_EVENTS, REGISTERED_HOOK_EVENTS } from "@cacp/protocol";
import { HOOK_PATH_PREFIX, SECRET_HEADER } from "./hook-server.ts";

type Json = Record<string, unknown>;
interface HookHandler extends Json {
  type: string;
  url?: string;
  command?: string;
}
interface MatcherGroup extends Json {
  matcher?: string;
  hooks: HookHandler[];
}

export interface HookInstallOptions {
  port: number;
  secret: string;
  /** Seconds Claude Code waits for a held PermissionRequest or Stop hook. */
  heldTimeoutSeconds?: number;
}

/** True for a handler this daemon wrote, whatever port or secret it used. */
function isOurs(h: HookHandler): boolean {
  return (
    (typeof h.url === "string" && h.url.includes(HOOK_PATH_PREFIX)) ||
    (typeof h.command === "string" && h.command.includes(HOOK_PATH_PREFIX))
  );
}

function handlerFor(event: string, o: HookInstallOptions): HookHandler {
  const url = `http://127.0.0.1:${o.port}${HOOK_PATH_PREFIX}${event}`;
  if (COMMAND_ONLY_HOOK_EVENTS.includes(event)) {
    // SessionStart accepts only command handlers; forward stdin with curl.
    return {
      type: "command",
      command:
        `curl -s -m 5 -X POST -H 'content-type: application/json' ` +
        `-H '${SECRET_HEADER}: ${o.secret}' --data-binary @- '${url}' >/dev/null 2>&1 || true`,
      timeout: 10,
    };
  }
  const held = event === "PermissionRequest" || event === "Stop";
  return {
    type: "http",
    url,
    headers: { [SECRET_HEADER]: o.secret },
    timeout: held ? (o.heldTimeoutSeconds ?? 600) : 10,
  };
}

function stripOurs(groups: unknown): MatcherGroup[] {
  if (!Array.isArray(groups)) return [];
  return (groups as MatcherGroup[])
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isOurs(h)) }))
    .filter((g) => g.hooks.length > 0);
}

/** Add this daemon's hooks to a settings object, keeping every other hook. */
export function mergeHooks(settings: Json, o: HookInstallOptions): Json {
  const hooks: Record<string, MatcherGroup[]> = {};
  for (const [event, groups] of Object.entries((settings.hooks as Json | undefined) ?? {})) {
    const kept = stripOurs(groups);
    if (kept.length > 0) hooks[event] = kept;
  }
  for (const event of REGISTERED_HOOK_EVENTS) {
    (hooks[event] ??= []).push({ hooks: [handlerFor(event, o)] });
  }
  return { ...settings, hooks };
}

/** Remove this daemon's hooks, leaving the rest of the file as it was. */
export function removeHooks(settings: Json): Json {
  const hooks: Record<string, MatcherGroup[]> = {};
  for (const [event, groups] of Object.entries((settings.hooks as Json | undefined) ?? {})) {
    const kept = stripOurs(groups);
    if (kept.length > 0) hooks[event] = kept;
  }
  const next: Json = { ...settings };
  if (Object.keys(hooks).length > 0) next.hooks = hooks;
  else delete next.hooks;
  return next;
}

export interface ApplyResult {
  path: string;
  backup: string | null;
  changed: boolean;
  content: string;
}

export function applyToSettingsFile(
  claudeConfigDir: string,
  transform: (settings: Json) => Json,
  { dryRun = false }: { dryRun?: boolean } = {},
): ApplyResult {
  const path = join(claudeConfigDir, "settings.json");
  const before = existsSync(path) ? readFileSync(path, "utf8") : "";
  // Refuse to touch a file we cannot parse rather than overwrite it.
  const current = before.trim() ? (JSON.parse(before) as Json) : {};
  const content = JSON.stringify(transform(current), null, 2) + "\n";
  const changed = content !== before;

  let backup: string | null = null;
  if (changed && !dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    if (before) {
      backup = `${path}.cacp-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      copyFileSync(path, backup);
    }
    writeFileSync(path, content);
  }
  return { path, backup, changed, content };
}
