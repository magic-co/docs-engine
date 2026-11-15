import { rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Files, repo } from "./fixture.ts";
import { generatedPage } from "../src/generated.ts";
import { hasErrors, lint, loadSite, looksLikePath } from "../src/index.ts";

function findings(changes: Files) {
  return lint(loadSite(repo(changes))).map(({ rule, severity, file, line }) => ({ rule, severity, file, line }));
}

const flow = (body: string) => `# Flow\n\n\`\`\`yaml flow\n${body}\n\`\`\`\n`;
const NODES = "title: T\nnodes:\n  a: { label: A, kind: start, at: [0, 0] }\n  b: { label: B, kind: end, at: [1, 0] }";

describe("lint", () => {
  it("passes a clean repo", () => {
    expect(findings({})).toEqual([]);
  });

  it("layout: requires the fixed files and folders", () => {
    const found = findings({ "GLOSSARY.md": null, "docs/research/README.md": null, "docs/research/bean-sources.md": null });
    expect(found.filter((finding) => finding.rule === "layout")).toEqual([
      { rule: "layout", severity: "error", file: "docs/research", line: undefined },
      { rule: "layout", severity: "error", file: "GLOSSARY.md", line: undefined },
    ]);
  });

  it("layout: rejects a page directly in docs/", () => {
    expect(findings({ "docs/loose.md": "# Loose\n" })).toEqual([{ rule: "layout", severity: "error", file: "docs/loose.md", line: undefined }]);
  });

  it("links: finds a missing file and a missing heading", () => {
    expect(
      findings({
        "docs/guides/cupping.md": "# Taste\n\n[gone](missing.md) and [no heading](01-roasting.md#warm-the-beans) and [ok](01-roasting.md#cool-the-beans).\n\n[ref]: ../../NOPE.md\n",
      }),
    ).toEqual([
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 5 },
    ]);
  });

  it("links: does not check external links", () => {
    expect(findings({ "docs/guides/cupping.md": "# Taste\n\n[web](https://example.com/x.md) [mail](mailto:a@example.com)\n" })).toEqual([]);
  });

  it("links: reports a link with malformed percent-encoding and checks the other links", () => {
    expect(findings({ "docs/guides/cupping.md": "# Taste\n\n[bad](#%) and [bad file](%zz.md).\n\n[gone](gone.md)\n" })).toEqual([
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 5 },
    ]);
  });

  it("links: finds the file of a link with a query and checks its heading", () => {
    expect(findings({ "docs/guides/cupping.md": "# Taste\n\n[ok](brewing.md?v=2) [bad](brewing.md?v=2#nope) [gone](gone.md?v=2)\n" })).toEqual([
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
      { rule: "links", severity: "error", file: "docs/guides/cupping.md", line: 3 },
    ]);
  });

  it("links: decodes reserved characters in the path of a link", () => {
    expect(findings({ "docs/guides/Q&A.md": "# Questions\n", "docs/guides/cupping.md": "# Taste\n\n[faq](Q%26A.md)\n" })).toEqual([]);
  });

  it("routes: reports each source of a route that two sources share", () => {
    const messages = (changes: Files) => lint(loadSite(repo(changes))).map(({ rule, file, message }) => [rule, file, message]);
    expect(messages({ "docs/guides/index.md": "# Guides too\n", "docs/guides/setup.md": "# Set up\n", "docs/guides/01-setup.md": "# Set up first\n" })).toEqual([
      ["routes", "docs/guides/01-setup.md", "the route `/guides/setup/` is also the route of `docs/guides/setup.md`"],
      ["routes", "docs/guides/index.md", "the route `/guides/` is also the route of `docs/guides/README.md`"],
      ["routes", "docs/guides/README.md", "the route `/guides/` is also the route of `docs/guides/index.md`"],
      ["routes", "docs/guides/setup.md", "the route `/guides/setup/` is also the route of `docs/guides/01-setup.md`"],
    ]);
  });

  it("routes: reports a name that gives an empty, `.` or `..` route segment, and gives the page no route", () => {
    const changes = { "docs/01-../README.md": "# Up\n", "docs/guides/..md": "# Dot\n", "docs/7-/a.md": "# Empty\n" };
    expect(findings(changes)).toEqual([
      { rule: "routes", severity: "error", file: "docs/01-../README.md", line: undefined },
      { rule: "routes", severity: "error", file: "docs/7-/a.md", line: undefined },
      { rule: "routes", severity: "error", file: "docs/guides/..md", line: undefined },
    ]);
    expect([...loadSite(repo(changes)).routes.keys()].filter((route) => /\/\.{0,2}\//.test(route.slice(1)))).toEqual([]);
  });

  it("routes: reports a name that is also a file name in the build", () => {
    expect(findings({ "docs/guides/index.html/README.md": "# Index\n", "docs/404.html/README.md": "# Missing\n", "docs/.docs-engine-manifest.json/README.md": "# List\n" })).toEqual([
      { rule: "routes", severity: "error", file: "docs/.docs-engine-manifest.json/README.md", line: undefined },
      { rule: "routes", severity: "error", file: "docs/404.html/README.md", line: undefined },
      { rule: "routes", severity: "error", file: "docs/guides/index.html/README.md", line: undefined },
    ]);
  });

  it("routes: reserves /assets/ for the client files of the build", () => {
    expect(findings({ "docs/assets/README.md": "# Assets\n", "docs/assets/logo.md": "# Logo\n" })).toEqual([
      { rule: "routes", severity: "error", file: "docs/assets/logo.md", line: undefined },
      { rule: "routes", severity: "error", file: "docs/assets/README.md", line: undefined },
    ]);
  });

  it("code-paths: matches lint.ignorePaths against the path without its line suffix", () => {
    const changes = { "docs/guides/cupping.md": "# Taste\n\nSee `src/grinder.ts:12`.\n", "docs.config.json": '{ "lint": { "ignorePaths": ["src/*.ts"] } }' };
    expect(findings(changes)).toEqual([]);
  });

  it("code-paths: reports a path outside the repo even when the file exists", () => {
    const root = repo();
    const outside = join(dirname(root), `${basename(root)}-outside.md`);
    writeFileSync(outside, "# Outside\n");
    try {
      writeFileSync(join(root, "docs/guides/cupping.md"), `# Taste\n\nSee \`../${basename(outside)}\` and \`../../../${basename(outside)}\`.\n`);
      expect(lint(loadSite(root)).map(({ rule, line }) => [rule, line])).toEqual([
        ["code-paths", 3],
        ["code-paths", 3],
      ]);
    } finally {
      rmSync(outside);
    }
  });

  it("code-paths: checks a file name with a line suffix and keeps the suffix in the message", () => {
    const found = lint(loadSite(repo({ "docs/guides/cupping.md": "# Taste\n\nSee `README.md:3` and `GONE.md:12:4`.\n" })));
    expect(found.map(({ rule, message }) => [rule, message])).toEqual([["code-paths", "`GONE.md:12:4` does not exist in the repo"]]);
  });

  it("code-paths: finds a path that does not exist, and skips ignored globs", () => {
    const page = "# Taste\n\nSee `src/grinder.ts` and `docs/guides/brewing.md` and `brewing.md`.\n";
    expect(findings({ "docs/guides/cupping.md": page })).toEqual([{ rule: "code-paths", severity: "error", file: "docs/guides/cupping.md", line: 3 }]);
    expect(findings({ "docs/guides/cupping.md": page, "docs.config.json": '{ "lint": { "ignorePaths": ["src/**"] } }' })).toEqual([]);
  });

  it("code-paths: finds a bare file name anywhere in the repo, and skips home paths", () => {
    const page = "# Taste\n\nSee `cupping.md`, `01-roasting.md`, `~/.roaster/config.json` and `gone.md`.\n";
    expect(findings({ "docs/guides/cupping.md": page }).map(({ line }) => line)).toEqual([3]);
    const found = lint(loadSite(repo({ "docs/guides/cupping.md": page }))).filter(({ rule }) => rule === "code-paths");
    expect(found.map(({ message }) => message)).toEqual(["`gone.md` does not exist in the repo"]);
  });

  it("code-paths: skips the pages that match lint.ignorePages", () => {
    const changes = { "docs/research/old-notes.md": "# Old notes\n\nSee `src/old-grinder.ts`.\n", "docs.config.json": '{ "lint": { "ignorePages": ["docs/research/**"] } }' };
    expect(findings(changes)).toEqual([]);
  });

  it("diagrams: finds an unknown type, bad YAML, a schema error and a bad reference", () => {
    const found = findings({
      "docs/orders/a.md": "# A\n\n```yaml pie\nslices: []\n```\n",
      "docs/orders/b.md": flow(`${NODES}\nedges: [ { from: a, to: b `),
      "docs/orders/c.md": flow(`${NODES}\nedges: []\ncolor: red`),
      "docs/orders/d.md": flow(`${NODES}\nedges:\n  - { from: a, to: kitchen }`),
    });
    expect([...new Set(found.map(({ file, rule }) => `${file} ${rule}`))]).toEqual([
      "docs/orders/a.md diagrams",
      "docs/orders/b.md diagrams",
      "docs/orders/c.md diagrams",
      "docs/orders/d.md diagrams",
    ]);
    expect(found[0]?.line).toBe(3);
  });

  it("diagrams: reports a type name that only an object prototype has as unknown", () => {
    expect(findings({ "docs/orders/a.md": "# A\n\n```yaml constructor\na: 1\n```\n" })).toEqual([
      { rule: "diagrams", severity: "error", file: "docs/orders/a.md", line: 3 },
    ]);
  });

  it("diagrams: reports an alias to a missing anchor", () => {
    expect(findings({ "docs/orders/a.md": flow("title: T\nnodes:\n  a: *missing\nedges: []") })).toEqual([
      { rule: "diagrams", severity: "error", file: "docs/orders/a.md", line: 3 },
    ]);
  });

  it("diagrams: does not take an inherited name such as toString for a node or a group", () => {
    const messages = (body: string) => lint(loadSite(repo({ "docs/orders/a.md": flow(body) }))).map((finding) => finding.message);
    expect(messages(`${NODES}\nedges: [ { from: toString, to: b } ]`)).toEqual([expect.stringContaining("`toString`")]);
    expect(messages(`${NODES}\nedges: [ { from: a, to: constructor } ]`)).toEqual([expect.stringContaining("`constructor`")]);
  });

  it("diagrams: rejects an edge from a node to itself", () => {
    expect(lint(loadSite(repo({ "docs/orders/a.md": flow(`${NODES}\nedges: [ { from: a, to: a } ]`) }))).map((finding) => finding.message)).toEqual([
      expect.stringContaining("edge 1 goes from `a` to itself"),
    ]);
  });

  it("diagrams: finds two nodes in one cell when a node id is empty", () => {
    const body = "title: T\nnodes:\n  '': { label: A, kind: start, at: [0, 0] }\n  b: { label: B, kind: end, at: [0, 0] }\nedges: []";
    expect(lint(loadSite(repo({ "docs/orders/a.md": flow(body) }))).map((finding) => finding.message)).toEqual([
      expect.stringContaining("the same cell [0,0]"),
    ]);
  });

  it("generated: passes an intact page and fails an edited one", () => {
    const intact = generatedPage("roast-log", "# Roast log\n\nBatch 12.\n");
    expect(findings({ "docs/orders/log.md": intact })).toEqual([]);
    expect(findings({ "docs/orders/log.md": intact.replace("12", "13") })).toEqual([
      { rule: "generated", severity: "error", file: "docs/orders/log.md", line: 1 },
    ]);
    expect(findings({ "docs/orders/log.md": "<!-- docs-engine:generated source=x -->\n# Log\n" })).toEqual([
      { rule: "generated", severity: "error", file: "docs/orders/log.md", line: 1 },
    ]);
  });

  it("glossary: warns about a repeated term that the glossary does not define", () => {
    const found = findings({
      "docs/guides/cupping.md": "# Taste\n\nWe sell Cold Brew in the shop.\n",
      "docs/guides/brewing.md": "# Brew\n\nAsk for Cold Brew at the bar. Use a Roast batch. The Green beans wait.\n",
    });
    expect(found).toEqual([{ rule: "glossary", severity: "warning", file: "docs/guides/brewing.md", line: 3 }]);
    expect(hasErrors(lint(loadSite(repo({ "docs/guides/cupping.md": "# Taste\n\nWe sell Cold Brew. Then Cold Brew.\n" }))))).toBe(false);
  });

  it("glossary: gives the line of a term that starts a continued line", () => {
    expect(findings({ "docs/guides/cupping.md": "# Taste\n\nWe sell\nCold Brew and\nthen Cold Brew.\n" })).toEqual([
      { rule: "glossary", severity: "warning", file: "docs/guides/cupping.md", line: 4 },
    ]);
  });
});

describe("looksLikePath", () => {
  it.each([
    ["src/cli.ts", true],
    ["docs/guides/", true],
    ["a/b", true],
    ["package.json", true],
    ["docs.config.json", true],
    ["README.md:12", true],
    ["src/cli.ts:12:4", true],
    ["localhost:4173", false],
    ["docs dev", false],
    ["@scope/pkg", false],
    ["--port", false],
    ["/guides/setup/", false],
    ["https://example.com/a.md", false],
    ["docs/<folder>/**", false],
    ["src/**/*.ts", false],
    ["{ a: 1 }", false],
    ["loadSite(root)", false],
    ["site.pages", false],
    ["127.0.0.1", false],
    ["v1.2.3", false],
    ["yaml flow", false],
  ])("%s -> %s", (text, expected) => {
    expect(looksLikePath(text)).toBe(expected);
  });
});
