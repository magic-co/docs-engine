import { describe, expect, it } from "vitest";
import { loadSite, type NavNode, type Page, type Site } from "../src/index.ts";
import { repo } from "./fixture.ts";

function outline(node: NavNode): unknown {
  return node.children.length === 0 ? `${node.title} ${node.route}` : { [`${node.title} ${node.route ?? "-"}`]: node.children.map(outline) };
}

function pageAt(site: Site, path: string): Page | undefined {
  return [...site.pages.values()].find((page) => page.path === path);
}

describe("loadSite", () => {
  it("builds the nav from the folder tree in order", () => {
    const site = loadSite(repo());
    expect(outline(site.nav)).toEqual({
      "Roastery docs /": [
        { "Decisions -": ["Roast in small batches /adr/small-batches/", "Ship on Monday /adr/ship-on-monday/"] },
        {
          "Guides /guides/": [
            "Roast a batch /guides/roasting/",
            "Ship an order /guides/shipping/",
            "Brew a cup /guides/brewing/",
            "Taste the coffee /guides/cupping/",
            "Tools /guides/tools/",
          ],
        },
        { "Orders -": ["Orders /orders/flow/"] },
        "Glossary /glossary/",
      ],
    });
  });

  it("labels the glossary Glossary in the nav, whatever its first heading", () => {
    const site = loadSite(repo({ "GLOSSARY.md": "# Roastery\n\nThe terms.\n" }));
    expect(site.nav.children.at(-1)).toEqual({ title: "Glossary", route: "/glossary/", children: [] });
    expect(pageAt(site, "GLOSSARY.md")?.title).toBe("Roastery");
  });

  it("keeps research in the site but out of the nav", () => {
    const site = loadSite(repo());
    expect(pageAt(site, "docs/research/bean-sources.md")?.route).toBe("/research/bean-sources/");
    expect(JSON.stringify(site.nav)).not.toContain("/research/");
  });

  it("keeps agent files out of the site", () => {
    const site = loadSite(repo());
    for (const path of ["AGENTS.md", "docs/agents/README.md"]) {
      const page = pageAt(site, path);
      expect(page?.area.name).toBe("agents");
      expect(page?.route).toBeUndefined();
    }
    expect([...site.routes.values()].map((page) => page.path)).not.toContain("AGENTS.md");
  });

  it("gives each page its area", () => {
    const site = loadSite(repo());
    const areas = Object.fromEntries([...site.pages.values()].map((page) => [page.path, page.area.name]));
    expect(areas).toMatchObject({
      "README.md": "home",
      "GLOSSARY.md": "glossary",
      "docs/adr/0001-small-batches.md": "adr",
      "docs/research/README.md": "research",
      "docs/guides/cupping.md": "docs",
    });
  });

  it("falls back to the file name for a title and to the config for the site title", () => {
    const site = loadSite(repo({ "docs/guides/cupping.md": "No heading here.\n", "docs.config.json": '{ "title": "Bean Book" }' }));
    expect(pageAt(site, "docs/guides/cupping.md")?.title).toBe("cupping");
    expect(site.title).toBe("Bean Book");
    expect(site.nav.title).toBe("Bean Book");
  });

  it("finds the yaml diagram blocks of a page", () => {
    const site = loadSite(repo());
    const page = pageAt(site, "docs/orders/flow.md");
    expect(page?.diagrams.map((block) => [block.type, block.line])).toEqual([["flow", 3]]);
  });

  it("rejects a config that does not match the schema", () => {
    expect(() => loadSite(repo({ "docs.config.json": '{ "titel": "x" }' }))).toThrow(/docs.config.json/);
  });
  it("refuses a theme file that does not exist or is outside the repo", () => {
    expect(() => loadSite(repo({ "docs.config.json": '{ "theme": "docs/theme.css" }' }))).toThrow(/the theme file "docs\/theme.css" does not exist/);
    expect(() => loadSite(repo({ "docs.config.json": '{ "theme": "../theme.css" }' }))).toThrow(/inside the repo/);
    expect(() => loadSite(repo({ "docs.config.json": '{ "theme": "docs/theme.scss" }' }))).toThrow(/docs.config.json/);
    expect(loadSite(repo({ "docs/theme.css": ":root {}\n", "docs.config.json": '{ "theme": "docs/theme.css" }' })).config.theme).toBe("docs/theme.css");
  });

});
