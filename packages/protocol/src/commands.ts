import { z } from "zod";
import { CommandStatus, CommandType } from "./enums.ts";

const sessionRef = { sessionId: z.string().min(1) };

export const CommandPayload = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("session.start"),
    cwd: z.string(),
    prompt: z.string().min(1),
    runtimeId: z.string().uuid(),
    permissionMode: z.enum(["default", "acceptEdits", "plan", "auto", "dontAsk"]).default("default"),
    title: z.string().optional(),
  }),
  z.object({ type: z.literal("session.prompt"), ...sessionRef, prompt: z.string().min(1) }),
  z.object({
    type: z.literal("session.continue"),
    ...sessionRef,
    instruction: z.string().min(1),
    /** The automation decision that produced this instruction, for the audit trail. */
    decisionId: z.string().uuid().optional(),
  }),
  z.object({ type: z.literal("session.resume"), ...sessionRef, prompt: z.string().optional() }),
  z.object({ type: z.literal("session.interrupt"), ...sessionRef }),
  z.object({ type: z.literal("session.stop"), ...sessionRef }),
  z.object({
    type: z.literal("approval.decide"),
    ...sessionRef,
    approvalId: z.string().uuid(),
    behavior: z.enum(["allow", "deny"]),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("verify.run"),
    cwd: z.string(),
    /** Only commands stored in the project's plan are accepted by the daemon. */
    criterionId: z.string().uuid(),
    command: z.string(),
    timeoutMs: z.number().int().positive().default(600_000),
  }),
  z.object({
    type: z.literal("review.run"),
    ...sessionRef,
    cwd: z.string(),
    prompt: z.string(),
    maxTurns: z.number().int().positive().default(30),
    model: z.string().optional(),
  }),
  z.object({ type: z.literal("auth.check"), profileId: z.string().uuid() }),
  z.object({ type: z.literal("auth.login"), profileId: z.string().uuid() }),
  z.object({
    type: z.literal("auth.login_code"),
    loginId: z.string().uuid(),
    /** Encrypted to the machine's public key; never stored or logged. */
    sealedCode: z.string(),
  }),
]);
export type CommandPayload = z.infer<typeof CommandPayload>;

export const Command = z.object({
  id: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  payload: CommandPayload,
});
export type Command = z.infer<typeof Command>;

export const CommandResult = z.object({
  commandId: z.string().uuid(),
  status: CommandStatus,
  error: z.string().nullable().default(null),
  result: z.record(z.unknown()).default({}),
});
export type CommandResult = z.infer<typeof CommandResult>;

export { CommandType };
