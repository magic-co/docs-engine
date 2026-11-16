import GithubSlugger from "github-slugger";
import type { Code, Root, RootContent } from "mdast";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type { Problem } from "../diagrams/index.ts";
import type { RenderContext } from "../diagrams/types.ts";
import { repoFile } from "../site/files.ts";
import { resolveLink } from "../site/links.ts";
import { headingSlugs, type PageDiagram, pageDiagrams } from "../site/markdown.ts";
import type { Page, Site } from "../site/types.ts";
import { routeUrl } from "../site/url.ts";
import { esc } from "./html.ts";

const toHtml = unified().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeStringify, { allowDangerousHtml: true });

export function renderContent(site: Site, page: Page): string {
  const tree = structuredClone(page.tree);
  const slugger = new GithubSlugger();
  for (const [heading, id] of headingSlugs(tree, slugger)) heading.data = { ...heading.data, hProperties: { id } };
  const diagrams = pageDiagrams(tree, slugger, { root: site.root, page: page.path });
  const href = (url: string) => linkHref(site, page, url);
  visit(tree, (node, index, parent) => {
    if (node.type === "link" || node.type === "definition") node.url = href(node.url);
    if (node.type !== "code" || !parent || index === undefined) return;
    const diagram = diagrams.get(node);
    if (!diagram) return;
    const file = (path: string) => repoFile(site.root, page.path, path);
    const html: RootContent = { type: "html", value: renderDiagram(node, diagram, slugger, { root: site.root, href, file }) };
    (parent.children as RootContent[]).splice(index, 1, html);
    return SKIP;
  });
  return toHtml.stringify(toHtml.runSync(tree as Root) as never);
}

function renderDiagram(node: Code, { type, checked, id }: PageDiagram, slugger: GithubSlugger, links: Pick<RenderContext, "root" | "href" | "file">): string {
  if (!checked.ok || id === undefined) return diagramError(type, checked.ok ? [] : checked.problems, node.value);
  return checked.type.render(checked.data, { id, ...links, anchor: (name) => slugger.slug(name) });
}

function diagramError(type: string, problems: Problem[], source: string): string {
  return (
    `<div class="docs-diagram-error" role="alert"><p>This <code>${esc(type)}</code> diagram has errors:</p>` +
    `<ul>${problems.map((problem) => `<li>line ${problem.line}: ${esc(problem.message)}</li>`).join("")}</ul>` +
    `<pre><code>${esc(source)}</code></pre></div>`
  );
}

function linkHref(site: Site, page: Page, url: string): string {
  const target = resolveLink(site, page, url);
  if (target.kind !== "local" || !target.page?.route) return url;
  const anchor = target.anchor ? `#${target.anchor}` : "";
  return target.page === page && anchor && !target.query ? anchor : `${routeUrl(site, target.page.route)}${target.query}${anchor}`;
}
