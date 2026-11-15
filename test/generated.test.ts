import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lint, loadSite, writeGeneratedPage } from "../src/index.ts";
import { repo } from "./fixture.ts";

describe("writeGeneratedPage", () => {
  it("writes a page that lint accepts until someone edits it", () => {
    const root = repo();
    const file = join(root, "docs/orders/menu.md");
    writeGeneratedPage(file, "menu-plugin", "# Menu\n\nEspresso and filter.\n");
    expect(readFileSync(file, "utf8")).toMatch(/^<!-- docs-engine:generated source=menu-plugin sha256=[0-9a-f]{64} -->\n# Menu\n/);
    expect(lint(loadSite(root))).toEqual([]);

    writeFileSync(file, readFileSync(file, "utf8").replace("filter", "cold brew"));
    expect(lint(loadSite(root)).map((finding) => finding.rule)).toEqual(["generated"]);

    writeGeneratedPage(file, "menu-plugin", "# Menu\n\nEspresso and cold brew.\n");
    expect(lint(loadSite(root))).toEqual([]);
  });

  it("rejects a source name with spaces", () => {
    expect(() => writeGeneratedPage(join(repo(), "docs/orders/x.md"), "two words", "")).toThrow();
  });
});
