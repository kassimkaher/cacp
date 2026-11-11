import { z } from "zod";
import { Command, CommandResult } from "./commands.ts";
import { EventEnvelope } from "./events.ts";

/** Daemon -> backend, over the daemon WebSocket. */
export const DaemonUpFrame = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("events"), events: z.array(EventEnvelope).min(1) }),
  z.object({ kind: z.literal("command.ack"), commandId: z.string().uuid() }),
  z.object({ kind: z.literal("command.result"), result: CommandResult }),
  z.object({
    kind: z.literal("heartbeat"),
    sentAt: z.string().datetime(),
    lastSeq: z.number().int().nonnegative(),
  }),
]);
export type DaemonUpFrame = z.infer<typeof DaemonUpFrame>;

/** Backend -> daemon. */
export const DaemonDownFrame = z.discriminatedUnion("kind", [
  /** Highest seq durably stored; the daemon may drop outbox rows up to it. */
  z.object({ kind: z.literal("events.ack"), seq: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("command"), command: Command }),
  z.object({
    kind: z.literal("hook.decision"),
    /** Correlates with the held hook request on the daemon. */
    hookRequestId: z.string(),
    behavior: z.enum(["allow", "deny", "continue", "none"]),
    message: z.string().optional(),
  }),
]);
export type DaemonDownFrame = z.infer<typeof DaemonDownFrame>;
