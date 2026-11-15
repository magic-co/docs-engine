import { existsSync } from "node:fs";
import { isAbsolute, join, matchesGlob, posix, relative, sep } from "node:path";
import type { InlineCode } from "mdast";
import { visit } from "unist-util-visit";
import type { Rule } from "../types.ts";

const EXTENSIONS = new Set(
  "md mdx json jsonc yaml yml toml ts tsx mts cts js jsx mjs cjs css scss html svg png jpg jpeg gif webp txt sh py rb go rs sql lock env".split(" "),
);

const LINE_SUFFIX = /:\d+(:\d+)?$/;

export function looksLikePath(code: string): boolean {
  const text = code.replace(LINE_SUFFIX, "");
  if (text === "" || /\s/.test(text) || /[<*{}()]/.test(text)) return false;
  if (/^[@\-/]/.test(text) || /^[a-z][a-z\d+.-]*:/i.test(text)) return false;
  if (text.includes("/")) return true;
  const extension = /\.([A-Za-z\d]+)$/.exec(text)?.[1];
  return extension !== undefined && text.length > extension.length + 1 && EXTENSIONS.has(extension.toLowerCase());
}

export const codePaths: Rule = {
  id: "code-paths",
  severity: "error",
  check(site) {
    const ignored = (path: string) => site.config.lint.ignorePaths.some((glob) => matchesGlob(path, glob));
    const inRepo = (candidate: string) => {
      const path = relative(site.root, candidate);
      return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path) && existsSync(candidate);
    };
    return [...site.pages.values()].flatMap((page) => {
      const found: { file: string; line: number; message: string }[] = [];
      visit(page.tree, "inlineCode", (node: InlineCode) => {
        if (!looksLikePath(node.value)) return;
        const path = node.value.replace(LINE_SUFFIX, "");
        if (ignored(path)) return;
        const candidates = [join(site.root, path), join(site.root, posix.dirname(page.path), path)];
        if (!candidates.some(inRepo)) {
          found.push({ file: page.path, line: node.position?.start.line ?? 1, message: `\`${node.value}\` does not exist in the repo` });
        }
      });
      return found;
    });
  },
};
