import GithubSlugger from "github-slugger";
import type { Code, Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { type BlockPlace, type Checked, checkDiagram } from "../diagrams/index.ts";
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

/** A diagram block, checked once. Only a valid diagram has an id. */
export interface PageDiagram {
  type: string;
  checked: Checked;
  id?: string;
}

// Each diagram block of the page. The id of a valid diagram is slugged after the headings, in page order. The renderer and the lint share this order.
export function pageDiagrams(tree: Root, slugger: GithubSlugger, place: BlockPlace): Map<Code, PageDiagram> {
  const diagrams = new Map<Code, PageDiagram>();
  visit(tree, "code", (node) => {
    const type = diagramType(node);
    if (!type) return;
    const checked = checkDiagram({ type, source: node.value, line: node.position?.start.line ?? 1 }, place);
    if (!checked.ok) return void diagrams.set(node, { type, checked });
    const title = (checked.data as { title?: unknown }).title;
    diagrams.set(node, { type, checked, id: slugger.slug(typeof title === "string" ? title : `${type}-diagram`) });
  });
  return diagrams;
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
