import { describe, expect, it } from "vitest";
import { lint, loadSite } from "../src/index.ts";
import { figureText } from "../src/diagrams/figure/text.ts";
import { respond } from "../src/render/site.ts";
import { CLEAN, type Files, repo } from "./fixture.ts";

const DRAWN = `<figure><svg aria-label="Order placed, then Roast batch"><text>Pack</text><text>bag</text></svg><figcaption>We Ship &amp; done.</figcaption></figure>`;
const MODULE = `export default { html: ${JSON.stringify(DRAWN)}, script: "window.drawn = 1;", css: ".shop { color: red }" };\n`;

const page = (block: string) => `# Shop\n\n\`\`\`yaml figure\n${block}\n\`\`\`\n`;

function figureFindings(changes: Files) {
  return lint(loadSite(repo(changes)))
    .filter((finding) => finding.rule === "figures" || finding.rule === "diagrams")
    .map(({ rule, file, line, message }) => ({ rule, file, line, message }));
}

describe("figure", () => {
  it("passes when the figure shows each node label of its source flow", () => {
    expect(figureFindings({ "figures/shop.mjs": MODULE, "docs/orders/shop.md": page("module: ../../figures/shop.mjs\nsource: flow.md#order-flow") })).toEqual([]);
  });

  it("finds a label of the source flow that the figure does not show", () => {
    const missing = MODULE.replace("Roast batch", "Roast");
    expect(figureFindings({ "figures/shop.mjs": missing, "docs/orders/shop.md": page("module: figures/shop.mjs\nsource: flow.md#order-flow") })).toEqual([
      {
        rule: "figures",
        file: "docs/orders/shop.md",
        line: 3,
        message: 'the figure does not show "Roast batch" from its source `flow.md#order-flow`. Draw it, or change the source.',
      },
    ]);
  });

  it("finds a source that names no flow, and a source file that is missing", () => {
    const found = figureFindings({
      "figures/shop.mjs": MODULE,
      "docs/orders/a.md": page("module: figures/shop.mjs\nsource: flow.md#nope"),
      "docs/orders/b.md": page("module: figures/shop.mjs\nsource: data/stock.yaml"),
    });
    expect(found.map((finding) => finding.message)).toEqual([
      "the source `flow.md#nope` names no flow diagram. Use the id of the flow: the slug of its title",
      "the source `data/stock.yaml` does not exist in the repo",
    ]);
  });

  it("accepts a source file that exists, and an illustration with no source", () => {
    expect(
      figureFindings({
        "figures/shop.mjs": MODULE,
        "data/stock.yaml": "beans: 3\n",
        "docs/orders/a.md": page("module: figures/shop.mjs\nsource: data/stock.yaml"),
        "docs/orders/b.md": page("module: figures/shop.mjs\nillustration: true"),
      }),
    ).toEqual([]);
  });

  it("reads the result when the module prints to stdout before and after it", () => {
    const noisy = `console.log("loading the shop");\nsetTimeout(() => console.log("done"), 10);\n${MODULE}`;
    expect(figureFindings({ "figures/shop.mjs": noisy, "docs/orders/shop.md": page("module: figures/shop.mjs\nsource: flow.md#order-flow") })).toEqual([]);
  });

  it("finds the source flow by the id that the page gives it", () => {
    const flowPage = (heading: string) => `# Orders\n\n## ${heading}\n\n${CLEAN["docs/orders/flow.md"]?.split("\n\n").slice(1).join("\n\n")}`;
    const changes = (heading: string, anchor: string) => ({
      "figures/shop.mjs": MODULE,
      "docs/orders/flow.md": flowPage(heading),
      "docs/orders/shop.md": page(`module: figures/shop.mjs\nsource: flow.md#${anchor}`),
    });
    expect(figureFindings(changes("Order flow", "order-flow-1"))).toEqual([]);
    expect(figureFindings(changes("Order flow", "order-flow")).map(({ message }) => message)).toEqual([
      "the source `flow.md#order-flow` names no flow diagram. Use the id of the flow: the slug of its title",
    ]);
  });

  it("needs exactly one of source and illustration", () => {
    const found = figureFindings({
      "figures/shop.mjs": MODULE,
      "docs/orders/a.md": page("module: figures/shop.mjs"),
      "docs/orders/b.md": page("module: figures/shop.mjs\nsource: data/x.yaml\nillustration: true"),
    });
    expect(found.map(({ rule, message }) => ({ rule, message }))).toEqual([
      { rule: "diagrams", message: "a figure needs a `source`, or `illustration: true` when it states no facts" },
      { rule: "diagrams", message: "a figure has a `source` or `illustration: true`, not both" },
    ]);
  });

  it("finds a missing module and a module that fails, and keeps only the figure fields", () => {
    const found = figureFindings({
      "figures/bad.mjs": 'throw new Error("no beans");\n',
      "figures/empty.mjs": "export default { script: 'x' };\n",
      "figures/fn.mjs": "export default { html: '<p>Roast</p>', script: () => 1 };\n",
      "figures/big.mjs": "export default { html: '<p>Roast</p>', weight: 10n };\n",
      "docs/orders/a.md": page("module: figures/gone.mjs\nillustration: true"),
      "docs/orders/b.md": page("module: figures/bad.mjs\nillustration: true"),
      "docs/orders/c.md": page("module: figures/empty.mjs\nillustration: true"),
      "docs/orders/d.md": page("module: figures/fn.mjs\nillustration: true"),
      "docs/orders/e.md": page("module: figures/big.mjs\nillustration: true"),
    });
    expect(found.map((finding) => finding.message)).toEqual([
      "the module `figures/gone.mjs` does not exist in the repo",
      "the module failed: no beans",
      "the module failed: the default export has no html string",
      "the module failed: the default export has a script that is not a string",
    ]);
  });

  it("renders the html, the css and the script of the module", () => {
    const result = respond(loadSite(repo({ "figures/shop.mjs": MODULE, "docs/orders/shop.md": page("module: figures/shop.mjs\nillustration: true") })), "/orders/shop/", "");
    if (result.status !== 200) throw new Error("no page");
    expect(result.html).toContain(`<div class="docs-figure" id="figure-diagram"><style>.shop { color: red }</style>${DRAWN}<script type="module">window.drawn = 1;</script></div>`);
  });

  it("reads the text, the labels and the entities of the html", () => {
    expect(figureText(DRAWN)).toBe("Pack bag We Ship & done. Order placed, then Roast batch");
    expect(figureText(`<p>a<script>no</script><style>no</style> b</p>`)).toBe("a b");
    expect(figureText(`<p>Roast&hellip; &eacute;&#x110000;&#xD800;&#1114112;&#55296;&#233; &constructor; &nope;</p>`)).toBe("Roast\u2026 \u00e9\uFFFD\uFFFD\uFFFD\uFFFD\u00e9 &constructor; &nope;");
  });
});
