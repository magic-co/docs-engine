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

  it("code-paths: checks a file name with a line suffix and keeps the suffix in the message", () => {
    const found = lint(loadSite(repo({ "docs/guides/cupping.md": "# Taste\n\nSee `README.md:3` and `GONE.md:12:4`.\n" })));
    expect(found.map(({ rule, message }) => [rule, message])).toEqual([["code-paths", "`GONE.md:12:4` does not exist in the repo"]]);
  });

  it("code-paths: finds a path that does not exist, and skips ignored globs", () => {
    const page = "# Taste\n\nSee `src/grinder.ts` and `docs/guides/brewing.md` and `brewing.md`.\n";
    expect(findings({ "docs/guides/cupping.md": page })).toEqual([{ rule: "code-paths", severity: "error", file: "docs/guides/cupping.md", line: 3 }]);
    expect(findings({ "docs/guides/cupping.md": page, "docs.config.json": '{ "lint": { "ignorePaths": ["src/**"] } }' })).toEqual([]);
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
