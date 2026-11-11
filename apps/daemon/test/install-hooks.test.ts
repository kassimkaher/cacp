import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyToSettingsFile, mergeHooks, removeHooks } from "../src/install-hooks.ts";

const opts = { port: 47821, secret: "s3cret-value" };
const existing = {
  model: "sonnet",
  hooks: {
    Stop: [{ hooks: [{ type: "command", command: "say done" }] }],
    PreCompact: [{ hooks: [{ type: "command", command: "echo compact" }] }],
  },
};

describe("mergeHooks", () => {
  it("keeps the user's own hooks and settings", () => {
    const out = mergeHooks(existing, opts) as typeof existing & { hooks: Record<string, any[]> };
    expect(out.model).toBe("sonnet");
    expect(out.hooks.PreCompact).toEqual(existing.hooks.PreCompact);
    expect(out.hooks.Stop).toHaveLength(2);
    expect(out.hooks.Stop[0]).toEqual(existing.hooks.Stop[0]);
  });

  it("is idempotent, even when the port or secret changes", () => {
    const once = mergeHooks(existing, opts);
    const twice = mergeHooks(once, { port: 5000, secret: "another-secret" }) as any;
    expect(twice.hooks.Stop).toHaveLength(2);
    expect(twice.hooks.Stop[1].hooks[0].url).toContain(":5000/");
  });

  it("uses a command handler for SessionStart and http elsewhere", () => {
    const out = mergeHooks({}, opts) as any;
    expect(out.hooks.SessionStart[0].hooks[0].type).toBe("command");
    expect(out.hooks.PermissionRequest[0].hooks[0]).toMatchObject({ type: "http", timeout: 600 });
    expect(out.hooks.PostToolUse[0].hooks[0].timeout).toBe(10);
  });

  it("uninstall restores the original hooks exactly", () => {
    expect(removeHooks(mergeHooks(existing, opts))).toEqual(existing);
    expect(removeHooks(mergeHooks({ model: "x" }, opts))).toEqual({ model: "x" });
  });
});

describe("applyToSettingsFile", () => {
  it("writes a backup, and dry-run writes nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), "cacp-"));
    const file = join(dir, "settings.json");
    const original = JSON.stringify(existing, null, 2) + "\n";
    writeFileSync(file, original);

    const dry = applyToSettingsFile(dir, (s) => mergeHooks(s, opts), { dryRun: true });
    expect(dry.changed).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(original);

    const real = applyToSettingsFile(dir, (s) => mergeHooks(s, opts));
    expect(real.backup && readFileSync(real.backup, "utf8")).toBe(original);

    applyToSettingsFile(dir, removeHooks);
    expect(readFileSync(file, "utf8")).toBe(original);
  });

  it("refuses to overwrite a settings file it cannot parse", () => {
    const dir = mkdtempSync(join(tmpdir(), "cacp-"));
    writeFileSync(join(dir, "settings.json"), "{ not json");
    expect(() => applyToSettingsFile(dir, (s) => mergeHooks(s, opts))).toThrow();
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toBe("{ not json");
  });
});
