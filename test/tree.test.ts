import { describe, expect, it } from "vitest";
import { lint, loadSite } from "../src/index.ts";
import { respond } from "../src/render/site.ts";
import { type Files, repo } from "./fixture.ts";

const TREE = `title: Roastery team
relation: Reports to
nodes:
  owner: { label: Owner, note: Ada }
  roaster: { label: Head Roaster, parent: owner, description: Roasts each batch., details: { Tasks: [Roast, Cup] } }
  shop: { label: Shop Lead, parent: owner }
  helper: { label: Roast Helper, parent: roaster }`;

const page = (block: string) => `# Team\n\n\`\`\`yaml tree\n${block}\n\`\`\`\n`;

function html(block = TREE): string {
  const result = respond(loadSite(repo({ "docs/team/team.md": page(block) })), "/team/team/", "");
  if (result.status !== 200) throw new Error("no page");
  return result.html;
}

const left = (page: string, id: string) => Number(new RegExp(`<docs-flow-node value="${id}"[^>]*style="left:([\\d.]+)%;[^"]*width:([\\d.]+)%`).exec(page)?.slice(1).reduce((a, b) => String(Number(a) + Number(b) / 2)));

function findings(changes: Files) {
  return lint(loadSite(repo(changes)))
    .filter((finding) => finding.rule === "diagrams")
    .map((finding) => finding.message);
}

describe("tree", () => {
  it("puts a parent over the middle of its children, and each leaf in its own column", () => {
    const page = html();
    expect(left(page, "owner")).toBeCloseTo((left(page, "roaster") + left(page, "shop")) / 2, 2);
    expect(left(page, "roaster")).toBeCloseTo(left(page, "helper"), 2);
    expect(left(page, "shop")).toBeGreaterThan(left(page, "helper"));
  });

  it("stacks two or more leaves of one parent in its column, under it", () => {
    const block = "title: T\nnodes:\n  a: { label: A }\n  b: { label: B, parent: a }\n  c: { label: C, parent: a }";
    const top = (page: string, id: string) => Number(new RegExp(`<docs-flow-node value="${id}"[^>]*style="left:[\\d.]+%;top:([\\d.]+)%`).exec(page)?.[1]);
    const page = html(block);
    expect(left(page, "b")).toBeCloseTo(left(page, "c"), 2);
    expect(left(page, "b")).toBeGreaterThan(left(page, "a"));
    expect(top(page, "c")).toBeGreaterThan(top(page, "b"));
  });

  it("names the parent with the relation in each card and in the connections", () => {
    const page = html();
    expect(page).toContain('<p class="docs-card-kind">Reports to Owner</p><p class="docs-card-title">Head Roaster</p>');
    expect(page).toContain("<li>Head Roaster: Reports to Owner</li><li>Shop Lead: Reports to Owner</li><li>Roast Helper: Reports to Head Roaster</li>");
    expect(page).toContain("<a><span>Owner <small>Ada</small></span></a>");
  });

  it("links a node with facts to its row, and prints a list detail as bullets", () => {
    const page = html();
    expect(page).toContain('<a href="#roastery-team-roaster">Head Roaster</a>');
    expect(page).toContain("<th>Node</th><th>Reports to</th>");
    expect(page).toContain("<dt>Tasks</dt><dd><ul><li>Roast</li><li>Cup</li></ul></dd>");
  });

  it("finds a missing parent and a loop", () => {
    const block = (nodes: string) => page(`title: T\nnodes:\n${nodes}`);
    expect(
      findings({
        "docs/team/a.md": block("  a: { label: A, parent: nobody }"),
        "docs/team/b.md": block("  a: { label: A, parent: b }\n  b: { label: B, parent: a }\n  c: { label: C }"),
      }),
    ).toEqual(["node `a` names parent `nobody`, which is not a node", "the parents of `a` to `b` to `a` make a loop"]);
  });
});
