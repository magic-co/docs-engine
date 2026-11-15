import { describe, expect, it } from "vitest";
import { loadSite } from "../src/index.ts";
import { respond } from "../src/render/site.ts";
import { repo } from "./fixture.ts";

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

  it("redirects a route without its trailing slash and answers 404 for an unknown route", () => {
    const site = loadSite(repo());
    expect(respond(site, "/guides", "")).toEqual({ status: 301, location: "/guides/" });
    expect(respond(site, "/nope/", "").status).toBe(404);
  });
});
