import { existsSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import type { Page, RepoPath, Site } from "./types.ts";

export type Target =
  | { kind: "external" }
  | { kind: "malformed" }
  | { kind: "local"; path: RepoPath; anchor?: string; exists: boolean; page?: Page };

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

export function resolveLink(site: Site, from: Page, url: string): Target {
  if (SCHEME.test(url) || url.startsWith("//")) return { kind: "external" };
  const hash = url.indexOf("#");
  let file: string;
  let anchor: string | undefined;
  try {
    file = decodeURI(hash === -1 ? url : url.slice(0, hash));
    anchor = hash === -1 ? undefined : decodeURIComponent(url.slice(hash + 1));
  } catch {
    return { kind: "malformed" };
  }
  const joined = file === "" ? from.path : file.startsWith("/") ? file.slice(1) : posix.join(posix.dirname(from.path), file);
  const path = (posix.normalize(joined).replace(/\/$/, "") || ".") as RepoPath;
  const inside = path !== ".." && !path.startsWith("../");
  const exists = inside && existsSync(join(site.root, path));
  const page = exists ? pageAt(site, path) : undefined;
  return { kind: "local", path, exists, anchor, page };
}

function pageAt(site: Site, path: RepoPath): Page | undefined {
  if (!statSync(join(site.root, path)).isDirectory()) return site.pages.get(path);
  const folder = path === "." ? "" : `${path}/`;
  return site.pages.get(`${folder}README.md` as RepoPath) ?? site.pages.get(`${folder}index.md` as RepoPath);
}
