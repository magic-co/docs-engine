import type { Heading, Nodes, Strong } from "mdast";
import { toString } from "mdast-util-to-string";
import { SKIP, visit } from "unist-util-visit";
import type { Page, RepoPath } from "../../site/types.ts";
import type { Rule } from "../types.ts";

const GLOSSARY = "GLOSSARY.md" as RepoPath;
const NOT_PROSE = new Set(["heading", "link", "linkReference", "inlineCode", "code", "html", "definition", "image"]);
const BLOCKS = new Set(["paragraph", "tableCell"]);
const WORD = String.raw`[A-Z][A-Za-z]*[a-z][A-Za-z]*`;
const CANDIDATE = new RegExp(String.raw`\b${WORD}(?:\s+${WORD})*`, "g");

export const glossary: Rule = {
  id: "glossary",
  severity: "warning",
  check(site) {
    const page = site.pages.get(GLOSSARY);
    const terms = page ? definedTerms(page) : [];
    const places = new Map<string, { term: string; file: string; line: number; at: Set<string> }>();
    for (const page of site.pages.values()) {
      visit(page.tree, (node, index, parent) => {
        if (NOT_PROSE.has(node.type)) return SKIP;
        if (node.type !== "text" || !parent) return;
        for (const match of node.value.matchAll(CANDIDATE)) {
          const prefix = node.value.slice(0, match.index);
          const before = prefix.trimEnd();
          const start = before === "" ? index === 0 && BLOCKS.has(parent.type) : /[.!?:]$/.test(before);
          if (start || isDefined(node.value.slice(match.index), terms)) continue;
          const line = (node.position?.start.line ?? 1) + (prefix.match(/\n/g)?.length ?? 0);
          const key = match[0].toLowerCase().replace(/\s+/g, " ");
          const entry = places.get(key) ?? { term: match[0], file: page.path, line, at: new Set<string>() };
          entry.at.add(`${page.path}:${line}`);
          places.set(key, entry);
        }
      });
    }
    return [...places.values()]
      .filter((entry) => entry.at.size >= 2)
      .map(({ term, file, line, at }) => ({
        file,
        line,
        message: `"${term}" looks like a term (${at.size} places), but ${GLOSSARY} does not define it`,
      }));
  },
};

function definedTerms(page: Page): string[] {
  const terms: string[] = [];
  visit(page.tree, (node: Nodes) => {
    if ((node.type === "heading" && (node as Heading).depth === 2) || node.type === "strong") {
      terms.push(toString(node as Heading | Strong).toLowerCase().replace(/\s+/g, " ").trim());
    }
  });
  return terms;
}

function isDefined(rest: string, terms: string[]): boolean {
  const text = rest.toLowerCase().replace(/\s+/g, " ");
  return terms.some((term) => {
    if (!text.startsWith(term)) return false;
    const after = text.slice(term.length);
    return !/^[a-z]/.test(after) || /^(s|es)(?![a-z])/.test(after);
  });
}
