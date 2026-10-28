import { describe, it, expect } from "vitest";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
describe("M0 infrastructure contracts", () => {
  it("checks database before reporting healthy", async () => {
    let queries = 0;
    const app = createApp(async () => {
      queries++;
    });
    const response = await app.inject("/health");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", database: "connected" });
    expect(queries).toBe(1);
    await app.close();
  });
  it("returns safe database and route errors", async () => {
    const app = createApp(async () => {
      throw new Error("secret password");
    });
    const response = await app.inject("/health");
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("secret");
    expect((await app.inject("/missing")).json().error.code).toBe("NOT_FOUND");
    await app.close();
  });
  it("derives local URL and preserves reverse proxy origin", () => {
    expect(readConfig({ DATABASE_URL: "postgres://db" }).PUBLIC_BASE_URL).toBe(
      "http://localhost:8155",
    );
    expect(
      readConfig({
        DATABASE_URL: "postgres://db",
        PUBLIC_DOMAIN: "https://plants.example",
      }).PUBLIC_BASE_URL,
    ).toBe("https://plants.example");
    expect(() =>
      readConfig({ DATABASE_URL: "x", PUBLIC_DOMAIN: "http://localhost:8155" }),
    ).toThrow();
  });
});
