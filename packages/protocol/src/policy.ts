import { z } from "zod";
import { SupervisionMode } from "./enums.ts";

export const AutoAction = z.enum(["continue", "resume", "restart", "verify", "review"]);
export type AutoAction = z.infer<typeof AutoAction>;

/**
 * Automation policy (design doc, section 11). Defaults are the conservative
 * ones: manual mode, nothing sent to an agent without the user.
 */
export const Policy = z.object({
  mode: SupervisionMode.default("manual"),
  auto_actions: z.array(AutoAction).default(["verify", "review"]),
  approval_required: z.array(AutoAction).default(["restart"]),
  reviewer: z
    .object({
      when: z.enum(["always", "on_inconclusive", "every_n", "never"]).default("on_inconclusive"),
      every_n: z.number().int().positive().default(3),
      max_turns: z.number().int().positive().default(30),
      model: z.string().nullable().default(null),
    })
    .default({}),
  max_continuations: z.number().int().nonnegative().default(10),
  max_continuations_per_task: z.number().int().nonnegative().default(3),
  max_recovery_attempts: z.number().int().nonnegative().default(3),
  repeated_failure: z.object({ threshold: z.number().int().positive().default(2) }).default({}),
  no_progress: z.object({ window: z.number().int().positive().default(2) }).default({}),
  /** Authentication and billing stops are never retried automatically. */
  on_auth_failure: z.literal("notify").default("notify"),
  on_billing: z.literal("notify").default("notify"),
  on_usage_limit: z
    .object({
      action: z.enum(["notify", "wait_and_resume"]).default("notify"),
      max_wait_minutes: z.number().int().positive().default(360),
    })
    .default({}),
  quiet_hours: z
    .object({ start: z.string(), end: z.string(), timezone: z.string() })
    .nullable()
    .default(null),
  wall_clock_budget_minutes: z.number().int().positive().nullable().default(null),
});
export type Policy = z.infer<typeof Policy>;

export const DEFAULT_POLICY: Policy = Policy.parse({});
