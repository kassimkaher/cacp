import { mkdtempSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHookServer, type HookServerOptions } from "../src/hook-server.ts";
import { Outbox } from "../src/outbox.ts";

const secret = "test-secret-1234";
let close: (() => void) | undefined;
afterEach(() => close?.());

async function start(extra: Partial<HookServerOptions> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cacp-"));
  const outbox = new Outbox(dir);
  const server = createHookServer({ secret, outbox, ...extra });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  close = () => server.close();
  const port = (server.address() as AddressInfo).port;
  const post = (event: string, body: unknown, s = secret) =>
    fetch(`http://127.0.0.1:${port}/cacp-hook/${event}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-cacp-secret": s },
      body: JSON.stringify(body),
    });
  return { dir, outbox, post };
}

describe("hook server", () => {
  it("records events with increasing seq and answers with an empty 200", async () => {
    const { dir, post } = await start();
    const r1 = await post("UserPromptSubmit", { hook_event_name: "UserPromptSubmit", session_id: "s1" });
    const r2 = await post("Stop", { hook_event_name: "Stop", session_id: "s1" });
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(await r2.text()).toBe("");
    const rows = readFileSync(join(dir, "events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows.map((r) => [r.seq, r.type])).toEqual([
      [1, "turn.started"],
      [2, "turn.stopped"],
    ]);
  });

  it("rejects a wrong secret and records nothing", async () => {
    const { outbox, post } = await start();
    const res = await post("Stop", { hook_event_name: "Stop", session_id: "s1" }, "wrong");
    expect(res.status).toBe(401);
    expect(outbox.lastSeq).toBe(0);
  });

  it("returns a decision only for decidable hooks", async () => {
    const decision = {
      hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "deny" } },
    };
    const { post } = await start({ decide: async () => decision });
    const perm = await post("PermissionRequest", {
      hook_event_name: "PermissionRequest",
      session_id: "s1",
      tool_name: "Bash",
    });
    expect(await perm.json()).toEqual(decision);
    const tool = await post("PreToolUse", { hook_event_name: "PreToolUse", session_id: "s1" });
    expect(await tool.text()).toBe("");
  });

  it("resumes the sequence after a restart", async () => {
    const { dir, post } = await start();
    await post("Stop", { hook_event_name: "Stop", session_id: "s1" });
    expect(new Outbox(dir).lastSeq).toBe(1);
  });

  it("tolerates malformed bodies without failing the hook", async () => {
    const { outbox, post } = await start();
    const res = await post("Stop", "not an object");
    expect(res.status).toBe(200);
    expect(outbox.lastSeq).toBe(0);
  });
});
