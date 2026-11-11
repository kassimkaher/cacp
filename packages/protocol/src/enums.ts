import { z } from "zod";

/** Session status: a projection of the event log (design doc, section 5). */
export const SessionStatus = z.enum([
  "active",
  "waiting_permission",
  "waiting_input",
  "idle",
  "stopped",
  "failed",
  "interrupted",
  "completed",
]);
export type SessionStatus = z.infer<typeof SessionStatus>;

/** Why a session is not running. Exactly one per transition out of `active`. */
export const StopReason = z.enum([
  "turn_complete",
  "needs_permission",
  "needs_input",
  "auth_failed",
  "usage_limit",
  "billing",
  "service_error",
  "context_or_output_limit",
  "tool_error",
  "user_interrupt",
  "process_crash",
  "stalled",
  "machine_offline",
  "unknown",
]);
export type StopReason = z.infer<typeof StopReason>;

/** Stop reasons that always go to the user; policy cannot override them. */
export const HARD_BLOCK_REASONS: readonly StopReason[] = [
  "needs_permission",
  "needs_input",
  "auth_failed",
  "billing",
];

export const SessionOwnership = z.enum(["observed", "managed", "reviewer"]);
export type SessionOwnership = z.infer<typeof SessionOwnership>;

export const EventType = z.enum([
  "session.discovered",
  "session.started",
  "session.resumed",
  "session.ended",
  "turn.started",
  "turn.stopped",
  "turn.failed",
  "tool.started",
  "tool.finished",
  "tool.failed",
  "permission.requested",
  "permission.resolved",
  "input.requested",
  "subagent.started",
  "subagent.stopped",
  "agenttask.created",
  "agenttask.completed",
  "process.seen",
  "process.exit",
  "session.stalled",
  "runtime.health",
  "auth.changed",
  "machine.online",
  "machine.offline",
  "message.appended",
  "notification.other",
]);
export type EventType = z.infer<typeof EventType>;

export const CommandType = z.enum([
  "session.start",
  "session.prompt",
  "session.continue",
  "session.resume",
  "session.interrupt",
  "session.stop",
  "approval.decide",
  "verify.run",
  "review.run",
  "auth.check",
  "auth.login",
  "auth.login_code",
]);
export type CommandType = z.infer<typeof CommandType>;

export const CommandStatus = z.enum([
  "queued",
  "sent",
  "acked",
  "running",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
]);
export type CommandStatus = z.infer<typeof CommandStatus>;

export const TaskStatus = z.enum([
  "pending",
  "in_progress",
  "claimed_done",
  "verified",
  "failed",
  "blocked",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const CriterionKind = z.enum(["command", "file", "reviewer", "manual"]);
export type CriterionKind = z.infer<typeof CriterionKind>;

export const SupervisionMode = z.enum(["manual", "supervised", "automatic"]);
export type SupervisionMode = z.infer<typeof SupervisionMode>;

export const AuthMethod = z.enum([
  "none",
  "claude.ai",
  "oauth_token",
  "api_key",
  "api_key_helper",
  "third_party",
]);
export type AuthMethod = z.infer<typeof AuthMethod>;
