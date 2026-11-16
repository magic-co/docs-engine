import { describe, expect, it } from "vitest";
import { lint, loadSite } from "../src/index.ts";
import { respond } from "../src/render/site.ts";
import { type Files, repo } from "./fixture.ts";

const FLOW = { title: "Stock flow", nodes: { bin: { label: "Green bin", kind: "start", at: [0, 0] }, roast: { label: "Roast", kind: "end", at: [1, 0] } }, edges: [{ from: "bin", to: "roast" }] };
const page = (from: string) => `# Stock\n\n\`\`\`yaml flow\nfrom: ${from}\n\`\`\`\n`;

function findings(changes: Files) {
  return lint(loadSite(repo(changes)))
    .filter((finding) => finding.rule === "diagrams")
    .map(({ file, line, message }) => ({ file, line, message }));
}

describe("a diagram block with from", () => {
  it("draws the default export of the module, relative to the page", () => {
    const root = repo({ "docs/stock/stock.md": page("data/stock.mjs"), "docs/stock/data/stock.mjs": `export default ${JSON.stringify(FLOW)};\n` });
    const result = respond(loadSite(root), "/stock/stock/", "");
    if (result.status !== 200) throw new Error("no page");
    expect(result.html).toContain('<docs-flow role="group" aria-label="Stock flow"');
    expect(result.html.match(/<docs-flow-node /g)).toHaveLength(2);
  });

  it("awaits a promise and lets the module read repo files", () => {
    const module = `import { readFileSync } from "node:fs";\nexport default Promise.resolve(JSON.parse(readFileSync("stock.json", "utf8")));\n`;
    expect(findings({ "docs/stock/stock.md": page("../../stock.mjs"), "stock.mjs": module, "stock.json": JSON.stringify(FLOW) })).toEqual([]);
  });

  it("reports a missing module, a module that fails, and data that breaks the schema", () => {
    const broken = { ...FLOW, nodes: { bin: { label: "Green bin", at: [0, 0] } }, edges: [] };
    expect(
      findings({
        "docs/stock/a.md": page("nope.mjs"),
        "docs/stock/b.md": page("throws.mjs"),
        "docs/stock/c.md": page("broken.mjs"),
        "docs/stock/throws.mjs": `throw new Error("no beans");\n`,
        "docs/stock/broken.mjs": `export default ${JSON.stringify(broken)};\n`,
      }),
    ).toEqual([
      { file: "docs/stock/a.md", line: 3, message: "the module `nope.mjs` in `from` does not exist in the repo" },
      { file: "docs/stock/b.md", line: 3, message: "the module failed: no beans" },
      { file: "docs/stock/c.md", line: 3, message: expect.stringMatching(/^the default export of the module: .*kind/) },
    ]);
  });
});
