import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { repo } from "./fixture.ts";

const vite = vi.hoisted(() => ({ fail: false }));
vi.mock("vite", async (original) => {
  const actual = await original<typeof import("vite")>();
  return { ...actual, build: (config: Parameters<typeof actual.build>[0]) => (vite.fail ? Promise.reject(new Error("bundle failed")) : actual.build(config)) };
});

const { buildSite } = await import("../src/build.ts");

describe("buildSite", () => {
  it("leaves an earlier output as it is when the client bundle fails", async () => {
    const root = repo();
    const out = join(root, "site-out");
    await buildSite({ root, out });
    const manifest = readFileSync(join(out, ".docs-engine-manifest.json"), "utf8");
    const home = readFileSync(join(out, "index.html"), "utf8");
    rmSync(join(root, "docs/guides/cupping.md"));
    vite.fail = true;
    await expect(buildSite({ root, out })).rejects.toThrow("bundle failed");
    vite.fail = false;
    expect(existsSync(join(out, "guides/cupping/index.html"))).toBe(true);
    expect(readFileSync(join(out, ".docs-engine-manifest.json"), "utf8")).toBe(manifest);
    expect(readFileSync(join(out, "index.html"), "utf8")).toBe(home);
  });
});
