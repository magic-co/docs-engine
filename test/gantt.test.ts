import { describe, expect, it } from "vitest";
import { lint, loadSite } from "../src/index.ts";
import { respond } from "../src/render/site.ts";
import { type Files, repo } from "./fixture.ts";

const GANTT = `title: Roastery launch
sections:
  build: { label: Build }
  open: { label: Open }
tasks:
  fit: { label: Fit out the shop, section: build, start: 2027-03-01, weeks: 2 }
  roaster: { label: Install the roaster, section: build, after: fit, days: 3, focal: true }
  doors: { label: Doors open, section: open, after: roaster, description: The first day of sales. }
  season: { label: First season, section: open, start: 2027-03-20, end: 2027-08-31 }`;

const page = (block: string) => `# Launch\n\n\`\`\`yaml gantt\n${block}\n\`\`\`\n`;

function html(block = GANTT): string {
  const result = respond(loadSite(repo({ "docs/plan/launch.md": page(block) })), "/plan/launch/", "");
  if (result.status !== 200) throw new Error("no page");
  return result.html;
}

const bar = (page: string, id: string) => {
  const match = new RegExp(`<docs-flow-node value="${id}"[\\s\\S]*?class="docs-gantt-(bar|mark)" style="left:([\\d.]+)%(?:;width:([\\d.]+)%)?`).exec(page);
  return { kind: match?.[1], left: Number(match?.[2]), width: Number(match?.[3] ?? 0) };
};

function findings(changes: Files) {
  return lint(loadSite(repo(changes)))
    .filter((finding) => finding.rule === "diagrams")
    .map((finding) => finding.message);
}

describe("gantt", () => {
  it("starts an after task the day after the other task ends, and puts a milestone on its last day", () => {
    const page = html();
    const fit = bar(page, "fit");
    const roaster = bar(page, "roaster");
    const doors = bar(page, "doors");
    expect(roaster.left).toBeCloseTo(fit.left + fit.width, 1);
    expect(roaster.width * 14).toBeCloseTo(fit.width * 3, 0);
    expect(doors.kind).toBe("mark");
    expect(doors.left).toBeCloseTo(roaster.left + (roaster.width * 2) / 3, 1);
  });

  it("gives the dates in the card and in the table", () => {
    const page = html();
    expect(page).toContain('<p class="docs-card-kind">Build · Mar 15 – 17, 2027 (3 days)</p><p class="docs-card-title">Install the roaster</p>');
    expect(page).toContain("<dt>After</dt><dd>Fit out the shop</dd>");
    expect(page).toContain('<td>Doors open</td><td>Mar 17, 2027</td>');
    expect(page).toContain('<docs-flow-node value="roaster" data-kind="gantt-focal"');
  });

  it("labels each month for a span of a few months", () => {
    const labels = [...html().matchAll(/<text class="docs-gantt-month" x="[\d.]+" y="\d+">([^<]+)<\/text>/g)].map((match) => match[1]);
    expect(labels).toEqual(["Mar 2027", "Apr", "May", "Jun", "Jul", "Aug"]);
  });

  it("finds bad sections, after tasks, loops, dates, and starts or ends given twice", () => {
    const block = (tasks: string) => page(`title: T\nsections: { a: { label: A } }\ntasks:\n${tasks}`);
    expect(
      findings({
        "docs/plan/a.md": block("  x: { label: X, section: b, start: 2027-01-01 }\n  y: { label: Y, section: a, start: 2027-01-01 }"),
        "docs/plan/b.md": block("  x: { label: X, section: a, after: nope }"),
        "docs/plan/c.md": block("  x: { label: X, section: a, after: y, days: 1 }\n  y: { label: Y, section: a, after: x, days: 1 }"),
        "docs/plan/d.md": block("  x: { label: X, section: a, start: 2027-02-01, end: 2027-01-01 }"),
        "docs/plan/e.md": block("  x: { label: X, section: a, start: 2027-02-30 }"),
        "docs/plan/f.md": block("  x: { label: X, section: a, start: 2027-01-01, on: 2027-01-02 }\n  y: { label: Y, section: a, start: 2027-01-01, end: 2027-01-09, days: 2 }"),
      }),
    ).toEqual([
      "task `x` names section `b`, which does not exist",
      "task `x` is after `nope`, which is not a task",
      "the `after` of `x` to `y` to `x` makes a loop",
      "task `x` ends on 2027-01-01, before it starts on 2027-02-01",
      "task `x` has `start: 2027-02-30`, which is not a real date",
      "task `x` needs one of `on`, `start` or `after`, not `on` and `start`",
      "task `y` has `end` and `days`. Give one end: `end`, `days` or `weeks`, or none for a milestone",
    ]);
  });
});
