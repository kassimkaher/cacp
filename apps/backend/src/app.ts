import Fastify, { type FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { Db } from "@cacp/db";

export interface AppDeps {
  /** Omitted in tests that do not need a database. */
  db?: Db;
}

export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.get("/health", async (_req, reply) => {
    let database: "ok" | "down" | "not_configured" = "not_configured";
    if (deps.db) {
      try {
        await deps.db.execute(sql`select 1`);
        database = "ok";
      } catch {
        database = "down";
      }
    }
    const healthy = database !== "down";
    return reply.code(healthy ? 200 : 503).send({ status: healthy ? "ok" : "degraded", database });
  });

  // Phase 1 adds: /v1/daemon (WebSocket), /v1/stream, and the REST routes
  // listed in the design doc, section 7.

  return app;
}
