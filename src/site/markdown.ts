import GithubSlugger from "github-slugger";
import type { Code, Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { DiagramBlock } from "./types.ts";

const parser = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdown(text: string): Root {
  return parser.runSync(parser.parse(text)) as Root;
}

export function firstHeading(tree: Root): string | undefined {
  const heading = tree.children.find((node): node is Heading => node.type === "heading" && node.depth === 1);
  return heading ? toString(heading) : undefined;
}

export function headingSlugs(tree: Root, slugger = new GithubSlugger()): Map<Heading, string> {
  const slugs = new Map<Heading, string>();
  visit(tree, "heading", (node) => {
    slugs.set(node, slugger.slug(toString(node)));
  });
  return slugs;
}

export function diagramType(node: Code): string | undefined {
  if (node.lang !== "yaml" || !node.meta) return undefined;
  return node.meta.trim().split(/\s+/)[0];
}

export function diagramBlocks(tree: Root): DiagramBlock[] {
  const blocks: DiagramBlock[] = [];
  visit(tree, "code", (node) => {
    const type = diagramType(node);
    if (type) blocks.push({ type, source: node.value, line: node.position?.start.line ?? 1 });
  });
  return blocks;
}

export function anchors(tree: Root): Set<string> {
  return new Set(headingSlugs(tree).values());
}
