import type { NavNode, Page, Route, Site } from "../site/types.ts";
import { routeUrl } from "../site/url.ts";
import { esc } from "./html.ts";

const RESEARCH = "/research/" as Route;

export function renderShell(site: Site, page: Page | undefined, content: string, head: string): string {
  const title = page && page.route !== "/" ? `${page.title} | ${site.title}` : site.title;
  const research = site.routes.has(RESEARCH) ? `<a href="${RESEARCH}">Research</a>` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${head}
</head>
<body>
<div class="docs-layout">
<nav class="docs-nav" aria-label="Docs">
<a class="docs-site-title" href="/"${page?.route === "/" ? ' aria-current="page"' : ""}>${esc(site.title)}</a>
${navList(site.nav.children, page?.route)}
</nav>
<main class="docs-main">
<article class="docs-page">
${content}
</article>
<footer class="docs-footer">${research}</footer>
</main>
</div>
</body>
</html>
`;
}

function navList(nodes: NavNode[], current: Route | undefined): string {
  if (nodes.length === 0) return "";
  return `<ul>${nodes.map((node) => `<li>${navLabel(node, current)}${navList(node.children, current)}</li>`).join("")}</ul>`;
}

function navLabel(node: NavNode, current: Route | undefined): string {
  if (!node.route) return `<span class="docs-nav-section">${esc(node.title)}</span>`;
  const here = node.route === current ? ' aria-current="page"' : "";
  const kind = node.children.length > 0 ? ' class="docs-nav-section"' : "";
  return `<a href="${esc(routeUrl(node.route))}"${kind}${here}>${esc(node.title)}</a>`;
}
