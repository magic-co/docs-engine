import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    writeFileSync(join(root, "README.md"), "# Roastery docs\n\nA new home page.\n");
    vite.fail = true;
    await expect(buildSite({ root, out })).rejects.toThrow("bundle failed");
    vite.fail = false;
    expect(existsSync(join(out, "guides/cupping/index.html"))).toBe(true);
    expect(readFileSync(join(out, ".docs-engine-manifest.json"), "utf8")).toBe(manifest);
    expect(readFileSync(join(out, "index.html"), "utf8")).toBe(home);
  });

  it("puts the theme of the repo into client.css after the default theme", async () => {
    const theme = ":root { --accent: #2f7d5b; }\n.docs-footer { letter-spacing: 0.3em; }\n";
    const root = repo({ "docs/theme.css": theme, "docs.config.json": '{ "theme": "docs/theme.css" }' });
    const out = join(root, "site-out");
    await buildSite({ root, out });
    const css = readFileSync(join(out, "assets/client.css"), "utf8");
    const defaults = css.indexOf("--accent:#eb6c36");
    const repoTheme = css.indexOf("--accent:#2f7d5b");
    expect(defaults).toBeGreaterThan(-1);
    expect(repoTheme).toBeGreaterThan(defaults);
    expect(css).toContain("letter-spacing:.3em");
  });

  it("builds the default theme alone without a theme file", async () => {
    const root = repo();
    const out = join(root, "site-out");
    await buildSite({ root, out });
    const css = readFileSync(join(out, "assets/client.css"), "utf8");
    expect(css).toContain("--accent:#eb6c36");
    expect(css).toContain("--measure:38rem");
  });
});
