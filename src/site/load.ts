import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, posix } from "node:path";
import { readGeneratedMark } from "../generated.ts";
import { readConfig } from "./config.ts";
import { type Area, areaOf, DOCS_DIR, LAYOUT } from "./layout.ts";
import { diagramBlocks, firstHeading, parseMarkdown } from "./markdown.ts";
import { checkBase } from "./url.ts";
import type { NavNode, Page, RepoPath, Route, Site } from "./types.ts";

const ORDER_PREFIX = /^(\d+)-/;
const SECTION_FILES = new Set(["README.md", "index.md"]);

export function loadSite(root: string, options: { base?: string } = {}): Site {
  const config = readConfig(root);
  const pages = new Map<RepoPath, Page>();
  for (const path of markdownFiles(root)) {
    const area = areaOf(path);
    if (area) pages.set(path, readPage(root, path, area));
  }
  const routes = new Map<Route, Page>();
  for (const page of pages.values()) if (page.route) routes.set(page.route, page);
  const title = config.title ?? pages.get("README.md" as RepoPath)?.title ?? basename(root);
  return { root, base: checkBase(options.base ?? "/"), config, title, pages, routes, nav: buildNav(title, [...pages.values()]) };
}

function markdownFiles(root: string): RepoPath[] {
  const top = ["README.md", "GLOSSARY.md", "AGENTS.md"].filter((file) => existsSync(join(root, file)));
  const docs = existsSync(join(root, DOCS_DIR))
    ? readdirSync(join(root, DOCS_DIR), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".md"))
        .map((file) => posix.join(DOCS_DIR, file.split("\\").join("/")))
    : [];
  return [...top, ...docs].sort() as RepoPath[];
}

function readPage(root: string, path: RepoPath, area: Area): Page {
  const text = readFileSync(join(root, path), "utf8");
  const tree = parseMarkdown(text);
  const route = routeOf(path, area);
  const generated = readGeneratedMark(text);
  return {
    path,
    route,
    title: firstHeading(tree) ?? fallbackTitle(path),
    area,
    tree,
    diagrams: diagramBlocks(tree),
    generated,
  };
}

function routeOf(path: RepoPath, area: Area): Route | undefined {
  if (area.visibility === "hidden") return undefined;
  if (area.place.kind === "file") return area.place.route as Route | undefined;
  const segments = path.split("/").slice(1);
  const file = segments.pop() ?? "";
  const parts = segments.map(stripOrder);
  if (!SECTION_FILES.has(file)) parts.push(stripOrder(file.replace(/\.md$/, "")));
  if (parts.some((part) => part === "" || part === "." || part === "..")) return undefined;
  return `/${parts.map((part) => `${part}/`).join("")}` as Route;
}

function stripOrder(name: string): string {
  return name.replace(ORDER_PREFIX, "");
}

function fallbackTitle(path: RepoPath): string {
  const file = posix.basename(path);
  const name = SECTION_FILES.has(file) ? posix.basename(posix.dirname(path)) : file.replace(/\.md$/, "");
  return stripOrder(name);
}

interface Folder {
  segments: string[];
  section?: Page;
  pages: Page[];
  folders: Map<string, Folder>;
}

function buildNav(title: string, pages: Page[]): NavNode {
  const root: Folder = { segments: [], pages: [], folders: new Map() };
  for (const page of pages) {
    if (page.area.visibility !== "nav") continue;
    const segments = page.area.place.kind === "file" ? [] : page.path.split("/").slice(1, -1);
    const folder = segments.reduce((parent, name) => child(parent, name), root);
    if (SECTION_FILES.has(posix.basename(page.path))) folder.section = page;
    else folder.pages.push(page);
  }
  return { ...folderNode(root), title };
}

function child(parent: Folder, name: string): Folder {
  let folder = parent.folders.get(name);
  if (!folder) {
    folder = { segments: [...parent.segments, name], pages: [], folders: new Map() };
    parent.folders.set(name, folder);
  }
  return folder;
}

function folderNode(folder: Folder): NavNode {
  const path = posix.join(DOCS_DIR, ...folder.segments);
  const fixed = LAYOUT.find(({ place }) => place.kind === "folder" && place.path === path)?.section;
  const title = fixed ?? folder.section?.title ?? humanize(stripOrder(folder.segments.at(-1) ?? ""));
  const entries = [
    ...folder.pages.map((page) => ({ name: posix.basename(page.path), node: leaf(page), fixed: page.area.place.kind === "file" })),
    ...[...folder.folders.entries()].map(([name, sub]) => ({ name, node: folderNode(sub), fixed: false })),
  ];
  entries.sort((a, b) => Number(a.fixed) - Number(b.fixed) || compareEntries(a.name, a.node.title, b.name, b.node.title));
  return {
    title,
    route: folder.section?.route,
    children: entries.map((entry) => entry.node),
  };
}

function compareEntries(nameA: string, titleA: string, nameB: string, titleB: string): number {
  const orderA = ORDER_PREFIX.exec(nameA)?.[1];
  const orderB = ORDER_PREFIX.exec(nameB)?.[1];
  if (orderA !== undefined && orderB !== undefined) return Number(orderA) - Number(orderB) || titleA.localeCompare(titleB);
  if (orderA !== undefined) return -1;
  if (orderB !== undefined) return 1;
  return titleA.localeCompare(titleB);
}

function leaf(page: Page): NavNode {
  return { title: page.area.navTitle ?? page.title, route: page.route, children: [] };
}

function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
