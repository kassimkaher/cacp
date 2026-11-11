import { z } from "zod";
import type { EventType, StopReason } from "./enums.ts";

/**
 * Fields Claude Code sends with every hook (see the hooks reference).
 * Unknown fields are kept: hook payloads change between Claude Code versions.
 */
export const HookInput = z
  .object({
    hook_event_name: z.string(),
    session_id: z.string().optional(),
    transcript_path: z.string().optional(),
    cwd: z.string().optional(),
    permission_mode: z.string().optional(),
    agent_id: z.string().optional(),
    agent_type: z.string().optional(),
  })
  .passthrough();
export type HookInput = z.infer<typeof HookInput>;

export interface NormalizedHook {
  type: EventType;
  sessionId: string | null;
  agentId: string | null;
  agentType: string | null;
  stopReason: StopReason | null;
  payload: Record<string, unknown>;
}

/** StopFailure error type -> our stop reason. */
const STOP_FAILURE_REASONS: Record<string, StopReason> = {
  rate_limit: "usage_limit",
  authentication_failed: "auth_failed",
  oauth_org_not_allowed: "auth_failed",
  cloud_credential_error: "auth_failed",
  billing_error: "billing",
  account_on_hold: "billing",
  overloaded: "service_error",
  server_error: "service_error",
  max_output_tokens: "context_or_output_limit",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * The StopFailure payload's field name for the error type is confirmed in the
 * Phase 0 spike; until then accept the plausible spellings.
 */
export function stopFailureReason(input: Record<string, unknown>): StopReason {
  const raw =
    str(input.error_type) ?? str(input.error) ?? str(input.reason) ?? str(input.matcher) ?? "";
  return STOP_FAILURE_REASONS[raw] ?? "unknown";
}

/**
 * Turn a raw Claude Code hook payload into a platform event.
 * Returns null for hooks the platform does not record.
 */
export function normalizeHook(raw: unknown): NormalizedHook | null {
  const parsed = HookInput.safeParse(raw);
  if (!parsed.success) return null;
  const input = parsed.data as HookInput & Record<string, unknown>;

  const base = {
    sessionId: input.session_id ?? null,
    agentId: input.agent_id ?? null,
    agentType: input.agent_type ?? null,
    stopReason: null as StopReason | null,
    payload: input as Record<string, unknown>,
  };
  const ev = (type: EventType, stopReason: StopReason | null = null): NormalizedHook => ({
    ...base,
    type,
    stopReason,
  });

  switch (input.hook_event_name) {
    case "SessionStart":
      return ev(input.source === "resume" ? "session.resumed" : "session.started");
    case "SessionEnd":
      return ev("session.ended");
    case "UserPromptSubmit":
      return ev("turn.started");
    case "Stop":
      return ev("turn.stopped", "turn_complete");
    case "StopFailure":
      return ev("turn.failed", stopFailureReason(input));
    case "PreToolUse":
      return ev("tool.started");
    case "PostToolUse":
      return ev("tool.finished");
    case "PostToolUseFailure":
      return ev("tool.failed");
    case "PermissionRequest":
      return ev("permission.requested", "needs_permission");
    case "SubagentStart":
      return ev("subagent.started");
    case "SubagentStop":
      return ev("subagent.stopped");
    case "TaskCreated":
      return ev("agenttask.created");
    case "TaskCompleted":
      return ev("agenttask.completed");
    case "Notification": {
      const kind = str(input.notification_type) ?? "";
      if (kind === "permission_prompt") return ev("permission.requested", "needs_permission");
      if (kind === "idle_prompt" || kind === "agent_needs_input" || kind.startsWith("elicitation"))
        return ev("input.requested", "needs_input");
      if (kind === "auth_success") return ev("auth.changed");
      return ev("notification.other");
    }
    default:
      return null;
  }
}

/** Hook events the daemon registers in Claude Code's settings. */
export const REGISTERED_HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Notification",
  "SubagentStart",
  "SubagentStop",
  "TaskCreated",
  "TaskCompleted",
  "Stop",
  "StopFailure",
] as const;

/** SessionStart accepts only command and mcp_tool handlers, not http. */
export const COMMAND_ONLY_HOOK_EVENTS: readonly string[] = ["SessionStart"];
