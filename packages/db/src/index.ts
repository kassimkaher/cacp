import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

export * as schema from "./schema.ts";

export type Db = NodePgDatabase<typeof schema>;

export function createDb(databaseUrl: string): Db {
  return drizzle(databaseUrl, { schema }) as Db;
}
