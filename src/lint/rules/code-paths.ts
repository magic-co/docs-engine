import { readdirSync } from "node:fs";
import { join, matchesGlob } from "node:path";
import type { InlineCode } from "mdast";
import { visit } from "unist-util-visit";
import { repoFile } from "../../site/files.ts";
import type { Rule } from "../types.ts";

const EXTENSIONS = new Set(
  "md mdx json jsonc yaml yml toml ts tsx mts cts js jsx mjs cjs css scss html svg png jpg jpeg gif webp txt sh py rb go rs sql lock env".split(" "),
);

const LINE_SUFFIX = /:\d+(:\d+)?$/;

export function looksLikePath(code: string): boolean {
  const text = code.replace(LINE_SUFFIX, "");
  if (text === "" || /\s/.test(text) || /[<*{}()]/.test(text)) return false;
  if (/^[@\-/~]/.test(text) || /^[a-z][a-z\d+.-]*:/i.test(text)) return false;
  if (text.includes("/")) return true;
  const extension = /\.([A-Za-z\d]+)$/.exec(text)?.[1];
  return extension !== undefined && text.length > extension.length + 1 && EXTENSIONS.has(extension.toLowerCase());
}

export const codePaths: Rule = {
  id: "code-paths",
  severity: "error",
  check(site) {
    const ignored = (path: string) => site.config.lint.ignorePaths.some((glob) => matchesGlob(path, glob));
    const skipped = (page: string) => site.config.lint.ignorePages.some((glob) => matchesGlob(page, glob));
    let names: Set<string> | undefined;
    const named = (name: string) => (names ??= fileNames(site.root)).has(name);
    return [...site.pages.values()].flatMap((page) => {
      if (skipped(page.path)) return [];
      const found: { file: string; line: number; message: string }[] = [];
      visit(page.tree, "inlineCode", (node: InlineCode) => {
        if (!looksLikePath(node.value)) return;
        const path = node.value.replace(LINE_SUFFIX, "");
        if (ignored(path)) return;
        if (!repoFile(site.root, page.path, path) && !(isBareName(path) && named(path))) {
          found.push({ file: page.path, line: node.position?.start.line ?? 1, message: `\`${node.value}\` does not exist in the repo` });
        }
      });
      return found;
    });
  },
};

// A bare file name, such as `layout.ts`, names a file anywhere in the repo.
function isBareName(path: string): boolean {
  return !path.includes("/");
}

const SKIPPED_DIRS = new Set(["node_modules", ".git"]);

function fileNames(root: string): Set<string> {
  const names = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) walk(join(dir, entry.name));
      } else names.add(entry.name);
    }
  };
  walk(root);
  return names;
}
