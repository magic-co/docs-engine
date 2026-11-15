import { existsSync } from "node:fs";
import { join, matchesGlob, posix } from "node:path";
import type { InlineCode } from "mdast";
import { visit } from "unist-util-visit";
import type { Rule } from "../types.ts";

const EXTENSIONS = new Set(
  "md mdx json jsonc yaml yml toml ts tsx mts cts js jsx mjs cjs css scss html svg png jpg jpeg gif webp txt sh py rb go rs sql lock env".split(" "),
);

export function looksLikePath(text: string): boolean {
  if (text === "" || /\s/.test(text) || /[<*{}()]/.test(text)) return false;
  if (text.startsWith("@") || text.startsWith("-") || /^[a-z][a-z\d+.-]*:/i.test(text)) return false;
  if (text.includes("/")) return !text.startsWith("//") && text !== "/";
  const extension = /\.([A-Za-z\d]+)$/.exec(text)?.[1];
  return extension !== undefined && text.length > extension.length + 1 && EXTENSIONS.has(extension.toLowerCase());
}

export const codePaths: Rule = {
  id: "code-paths",
  severity: "error",
  check(site) {
    const ignored = (text: string) => site.config.lint.ignorePaths.some((glob) => matchesGlob(text, glob));
    return [...site.pages.values()].flatMap((page) => {
      const found: { file: string; line: number; message: string }[] = [];
      visit(page.tree, "inlineCode", (node: InlineCode) => {
        if (!looksLikePath(node.value) || ignored(node.value)) return;
        const path = node.value.replace(/:\d+(:\d+)?$/, "");
        const candidates = [join(site.root, path), join(site.root, posix.dirname(page.path), path)];
        if (!candidates.some((candidate) => existsSync(candidate))) {
          found.push({ file: page.path, line: node.position?.start.line ?? 1, message: `\`${node.value}\` does not exist in the repo` });
        }
      });
      return found;
    });
  },
};
