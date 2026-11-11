import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, EventEnvelope, ReviewerAssessment, normalizeHook } from "../src/index.ts";

const base = { session_id: "s-1", cwd: "/repo", transcript_path: "/t.jsonl" };

describe("normalizeHook", () => {
  it("maps Stop to a completed turn", () => {
    const n = normalizeHook({ ...base, hook_event_name: "Stop", last_assistant_message: "done" });
    expect(n?.type).toBe("turn.stopped");
    expect(n?.stopReason).toBe("turn_complete");
    expect(n?.sessionId).toBe("s-1");
  });

  it("classifies StopFailure errors", () => {
    const reason = (error_type: string) =>
      normalizeHook({ ...base, hook_event_name: "StopFailure", error_type })?.stopReason;
    expect(reason("rate_limit")).toBe("usage_limit");
    expect(reason("authentication_failed")).toBe("auth_failed");
    expect(reason("billing_error")).toBe("billing");
    expect(reason("overloaded")).toBe("service_error");
    expect(reason("something_new")).toBe("unknown");
  });

  it("distinguishes resume from start", () => {
    expect(normalizeHook({ ...base, hook_event_name: "SessionStart", source: "resume" })?.type).toBe(
      "session.resumed",
    );
    expect(normalizeHook({ ...base, hook_event_name: "SessionStart", source: "startup" })?.type).toBe(
      "session.started",
    );
  });

  it("keeps subagent identity", () => {
    const n = normalizeHook({
      ...base,
      hook_event_name: "SubagentStop",
      agent_id: "a-9",
      agent_type: "Explore",
    });
    expect(n).toMatchObject({ type: "subagent.stopped", agentId: "a-9", agentType: "Explore" });
  });

  it("maps notifications by type", () => {
    const t = (notification_type: string) =>
      normalizeHook({ ...base, hook_event_name: "Notification", notification_type });
    expect(t("permission_prompt")?.stopReason).toBe("needs_permission");
    expect(t("idle_prompt")?.type).toBe("input.requested");
    expect(t("plugin_notification")?.type).toBe("notification.other");
  });

  it("ignores hooks it does not record and malformed input", () => {
    expect(normalizeHook({ ...base, hook_event_name: "PreCompact" })).toBeNull();
    expect(normalizeHook("nope")).toBeNull();
  });
});

describe("schemas", () => {
  it("default policy is manual and never auto-continues", () => {
    expect(DEFAULT_POLICY.mode).toBe("manual");
    expect(DEFAULT_POLICY.auto_actions).not.toContain("continue");
  });

  it("validates an event envelope", () => {
    const e = EventEnvelope.parse({
      machineId: "7b0d0c1e-58a5-4d39-9f0e-2f4a8a3a8a11",
      sessionId: "s-1",
      seq: 1,
      type: "turn.stopped",
      occurredAt: new Date().toISOString(),
    });
    expect(e.agentId).toBeNull();
  });

  it("rejects an assessment missing required fields", () => {
    expect(ReviewerAssessment.safeParse({ schema_version: 1 }).success).toBe(false);
  });
});
