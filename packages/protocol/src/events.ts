import { z } from "zod";
import { EventType, StopReason } from "./enums.ts";

/**
 * One immutable observation. `seq` is per machine and strictly increasing;
 * (machineId, seq) is the idempotency key for ingestion.
 */
export const EventEnvelope = z.object({
  machineId: z.string().uuid(),
  runtimeId: z.string().uuid().nullable().default(null),
  /** Claude Code's own session id (a UUID string), not our row id. */
  sessionId: z.string().min(1).nullable().default(null),
  /** Claude Code's agent id; null for the main agent. */
  agentId: z.string().min(1).nullable().default(null),
  agentType: z.string().nullable().default(null),
  projectId: z.string().uuid().nullable().default(null),
  seq: z.number().int().nonnegative(),
  type: EventType,
  stopReason: StopReason.nullable().default(null),
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()).default({}),
});
export type EventEnvelope = z.infer<typeof EventEnvelope>;
