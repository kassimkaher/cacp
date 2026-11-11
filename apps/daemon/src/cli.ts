#!/usr/bin/env -S npx tsx
import { loadConfig } from "./config.ts";
import { createHookServer } from "./hook-server.ts";
import { applyToSettingsFile, mergeHooks, removeHooks } from "./install-hooks.ts";
import { Outbox } from "./outbox.ts";

const USAGE = `cacp-daemon

  run                       Start the hook server and log events
  hooks install [--dry-run] Add the daemon's hooks to Claude Code settings
  hooks uninstall [--dry-run]
                            Remove them again

Environment: CACP_HOOK_PORT, CACP_HOOK_SECRET, CACP_DATA_DIR, CLAUDE_CONFIG_DIR
`;

function main(argv: string[]): void {
  const config = loadConfig();
  const [cmd, sub] = argv;
  const dryRun = argv.includes("--dry-run");

  if (cmd === "run") {
    const outbox = new Outbox(config.CACP_DATA_DIR);
    const server = createHookServer({
      secret: config.CACP_HOOK_SECRET,
      outbox,
      onEvent: (e) =>
        console.log(
          `#${e.seq} ${e.type}` +
            (e.stopReason ? ` (${e.stopReason})` : "") +
            ` session=${e.sessionId ?? "-"}` +
            (e.agentId ? ` agent=${e.agentType ?? "?"}:${e.agentId}` : ""),
        ),
    });
    server.listen(config.CACP_HOOK_PORT, "127.0.0.1", () => {
      console.log(`hook server on http://127.0.0.1:${config.CACP_HOOK_PORT}`);
      console.log(`events -> ${config.CACP_DATA_DIR}/events.jsonl (last seq ${outbox.lastSeq})`);
    });
    return;
  }

  if (cmd === "hooks" && (sub === "install" || sub === "uninstall")) {
    const result = applyToSettingsFile(
      config.CLAUDE_CONFIG_DIR,
      sub === "install"
        ? (s) => mergeHooks(s, { port: config.CACP_HOOK_PORT, secret: config.CACP_HOOK_SECRET })
        : removeHooks,
      { dryRun },
    );
    if (dryRun) {
      console.log(`# would write ${result.path}\n${result.content}`);
    } else if (result.changed) {
      console.log(`updated ${result.path}`);
      if (result.backup) console.log(`backup  ${result.backup}`);
    } else {
      console.log(`no change to ${result.path}`);
    }
    return;
  }

  console.log(USAGE);
  process.exitCode = cmd ? 1 : 0;
}

main(process.argv.slice(2));
