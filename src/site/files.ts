import { existsSync } from "node:fs";
import { isAbsolute, join, posix, relative, sep } from "node:path";
import type { RepoPath } from "./types.ts";

// A path in a page is relative to the repo root or to the page. It must stay inside the repo.
export function repoFile(root: string, page: RepoPath, path: string): string | undefined {
  return [join(root, path), join(root, posix.dirname(page), path)].find((candidate) => {
    const inside = relative(root, candidate);
    return inside !== ".." && !inside.startsWith(`..${sep}`) && !isAbsolute(inside) && existsSync(candidate);
  });
}
