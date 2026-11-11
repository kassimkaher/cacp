import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const Env = z.object({
  CACP_HOOK_PORT: z.coerce.number().int().default(47821),
  CACP_HOOK_SECRET: z.string().min(8).default("change-me-please"),
  CACP_DATA_DIR: z.string().default(join(homedir(), ".cacp")),
  /** Claude Code config directory; one per authentication profile. */
  CLAUDE_CONFIG_DIR: z.string().default(join(homedir(), ".claude")),
});

export type DaemonConfig = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DaemonConfig {
  return Env.parse(env);
}
