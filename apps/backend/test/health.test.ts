import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";

describe("GET /health", () => {
  it("reports ok without a database configured", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", database: "not_configured" });
    await app.close();
  });
});
