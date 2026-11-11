import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().default("postgres://cacp:cacp@localhost:5432/cacp"),
  PORT: z.coerce.number().int().default(8080),
  HOST: z.string().default("0.0.0.0"),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return Env.parse(env);
}
