import type { Page, Route, Site } from "../site/types.ts";
import { renderContent } from "./page.ts";
import { renderShell } from "./shell.ts";

export type Response = { status: 200 | 404; html: string } | { status: 301; location: Route };

export function respond(site: Site, pathname: string, head: string): Response {
  const page = site.routes.get(pathname as Route);
  if (page) return { status: 200, html: renderPage(site, page, head) };
  const slashed = `${pathname}/` as Route;
  if (!pathname.endsWith("/") && site.routes.has(slashed)) return { status: 301, location: slashed };
  return { status: 404, html: notFound(site, head) };
}

export function renderPage(site: Site, page: Page, head: string): string {
  return renderShell(site, page, renderContent(site, page), head);
}

export function notFound(site: Site, head: string): string {
  return renderShell(site, undefined, `<h1>Page not found</h1><p><a href="/">Go to the home page</a>.</p>`, head);
}
