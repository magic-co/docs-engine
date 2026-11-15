import { describe, expect, it } from "vitest";
import { loadSite } from "../src/index.ts";
import { respond } from "../src/render/site.ts";
import { CLEAN, repo } from "./fixture.ts";

function html(changes = {}, route = "/orders/flow/"): string {
  const result = respond(loadSite(repo(changes)), route, "");
  if (result.status !== 200) throw new Error(`no page at ${route}`);
  return result.html;
}

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0;

describe("flow render", () => {
  it("prints one node element per node and a details row for each described node", () => {
    const page = html();
    expect(count(page, /<docs-flow-node /g)).toBe(4);
    expect([...page.matchAll(/<tr id="([^"]+)"/g)].map((match) => match[1])).toEqual(["order-flow-roast"]);
    expect(page).toContain("<dt>Entry</dt><dd>Beans are weighed</dd>");
  });

  it("lists each edge as text for screen readers", () => {
    const list = /<ul class="docs-flow-connections" aria-label="Connections">(.*?)<\/ul>/.exec(html())?.[1];
    expect(list).toBe("<li>Order placed to Roast batch</li><li>Roast batch to Pack bag: cooled</li><li>Pack bag to Ship</li>");
  });

  it("links each node to its href as a route, else to its details row", () => {
    const page = html();
    const links = [...page.matchAll(/<docs-flow-node value="(\w+)"[^>]*>.*?<a( href="[^"]*")?>/g)].map((match) => [match[1], match[2] ?? ""]);
    expect(links).toEqual([
      ["order", ""],
      ["roast", ' href="#order-flow-roast"'],
      ["pack", ' href="/guides/roasting/#cool-the-beans"'],
      ["ship", ""],
    ]);
  });

  it("gives each details row an id that no heading on the page uses", () => {
    const page = html({ "docs/orders/flow.md": `${CLEAN["docs/orders/flow.md"]}\n## Order flow roast\n` });
    expect(page).toContain('<h2 id="order-flow-roast">');
    const row = /<tr id="([^"]+)"/.exec(page)?.[1];
    expect(row).not.toBe("order-flow-roast");
    expect(page).toContain(`<a href="#${row}">Roast batch</a>`);
  });

  it("keeps a wide node at column 0 and its group inside the drawing", () => {
    const wide = "title: T\nnodes:\n  a: { label: Weigh the green beans for the batch, kind: step, at: [0, 0], group: g }\n  b: { label: B, kind: end, at: [1, 0] }\ngroups:\n  g: { label: G }\nedges: [ { from: a, to: b } ]";
    const page = html({ "docs/orders/flow.md": `# Orders\n\n\`\`\`yaml flow\n${wide}\n\`\`\`\n` });
    expect(page).toContain("<docs-flow-node");
    expect(page).not.toMatch(/left:-|x="-/);
  });

  it("shows a diagram error in the page instead of failing", () => {
    const page = html({ "docs/orders/flow.md": "# Orders\n\n```yaml flow\ntitle: T\nnodes: { a: { label: A, kind: step, at: [0, 0] } }\nedges: [ { from: a, to: nowhere } ]\n```\n" });
    expect(page).toContain('class="docs-diagram-error"');
    expect(page).toContain("nowhere");
    expect(page).not.toContain("<docs-flow-node");
  });
});

describe("page render", () => {
  it("rewrites Markdown links to routes and gives headings GitHub ids", () => {
    const page = html({}, "/guides/");
    expect(page).toContain('<a href="/guides/roasting/#cool-the-beans">roasting</a>');
    expect(html({}, "/guides/roasting/")).toContain('<h2 id="cool-the-beans">Cool the beans</h2>');
  });

  it("renders a page with a malformed percent-encoded link", () => {
    expect(html({ "docs/guides/cupping.md": "# Taste\n\n[bad](#%)\n" }, "/guides/cupping/")).toContain('<a href="#%25">bad</a>');
  });

  it("marks the current page in the nav and links research in the footer", () => {
    const page = html({}, "/guides/");
    expect(page).toContain('<a href="/guides/" class="docs-nav-section" aria-current="page">Guides</a>');
    expect(page).toMatch(/<footer class="docs-footer"><a href="\/research\/">Research<\/a><\/footer>/);
  });

  it("escapes a route in the nav", () => {
    expect(html({ "docs/guides/a&b.md": "# Beans and brew\n" }, "/guides/")).toContain('<a href="/guides/a&amp;b/">Beans and brew</a>');
  });

  it("keeps the query of a link in its route", () => {
    expect(html({ "docs/guides/cupping.md": "# Taste\n\n[q](01-roasting.md?v=2#cool-the-beans)\n" }, "/guides/cupping/")).toContain(
      '<a href="/guides/roasting/?v=2#cool-the-beans">q</a>',
    );
  });

  it("redirects a route without its trailing slash and answers 404 for an unknown route", () => {
    const site = loadSite(repo());
    expect(respond(site, "/guides", "")).toEqual({ status: 301, location: "/guides/" });
    expect(respond(site, "/nope/", "").status).toBe(404);
  });
});
