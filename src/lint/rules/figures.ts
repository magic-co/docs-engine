import { slug } from "github-slugger";
import { checkDiagram } from "../../diagrams/index.ts";
import type { Figure } from "../../diagrams/figure/model.ts";
import { FigureError, runFigure } from "../../diagrams/figure/run.ts";
import { figureText, normalize } from "../../diagrams/figure/text.ts";
import type { Flow } from "../../diagrams/flow/model.ts";
import { repoFile } from "../../site/files.ts";
import { resolveLink } from "../../site/links.ts";
import type { Page, Site } from "../../site/types.ts";
import type { Rule } from "../types.ts";

export const figures: Rule = {
  id: "figures",
  severity: "error",
  check(site) {
    return [...site.pages.values()].flatMap((page) =>
      page.diagrams
        .filter((block) => block.type === "figure")
        .flatMap((block) => {
          const checked = checkDiagram(block);
          if (!checked.ok) return [];
          return checkFigure(site, page, checked.data as Figure).map((message) => ({ file: page.path, line: block.line, message }));
        }),
    );
  },
};

function checkFigure(site: Site, page: Page, figure: Figure): string[] {
  const file = repoFile(site.root, page.path, figure.module);
  if (!file) return [`the module \`${figure.module}\` does not exist in the repo`];
  let html: string;
  try {
    html = runFigure(file, site.root).html;
  } catch (error) {
    if (error instanceof FigureError) return [error.message];
    throw error;
  }
  if (figure.source === undefined) return [];
  if (!figure.source.includes("#")) {
    return repoFile(site.root, page.path, figure.source) ? [] : [`the source \`${figure.source}\` does not exist in the repo`];
  }
  const flow = sourceFlow(site, page, figure.source);
  if (typeof flow === "string") return [flow];
  const drawn = figureText(html);
  return Object.values(flow.nodes)
    .map((node) => normalize(node.label))
    .filter((label) => !drawn.includes(label))
    .map((label) => `the figure does not show "${label}" from its source \`${figure.source}\`. Draw it, or change the source.`);
}

function sourceFlow(site: Site, page: Page, source: string): Flow | string {
  const target = resolveLink(site, page, source);
  if (target.kind !== "local" || !target.page || !target.anchor) return `the source \`${source}\` is not a page in the site`;
  for (const block of target.page.diagrams) {
    if (block.type !== "flow") continue;
    const checked = checkDiagram(block);
    if (checked.ok && slug((checked.data as Flow).title) === target.anchor) return checked.data as Flow;
  }
  return `the source \`${source}\` names no flow diagram. Use the id of the flow: the slug of its title`;
}
