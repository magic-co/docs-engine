import { esc } from "../../render/html.ts";
import { type BoardNode, renderBoard } from "../board.ts";
import type { RenderContext } from "../types.ts";
import type { Tree } from "./model.ts";

const GAP = 24;
const ROW = 108;
const TOP = 24;
const MARGIN = 24;
const MIN_W = 120;
const MAX_W = 184;
const INDENT = 28;
const STACK_GAP = 12;

export function renderTree(tree: Tree, context: RenderContext): string {
  const relation = tree.relation ?? "Under";
  const entries = Object.entries(tree.nodes);
  const ids = entries.map(([id]) => id);
  const children = new Map(ids.map((id) => [id, entries.filter(([, node]) => node.parent === id).map(([child]) => child)]));
  const isLeaf = (id: string) => (children.get(id) ?? []).length === 0;
  const h = entries.some(([, node]) => node.note !== undefined) ? 64 : 52;
  const w = Math.min(MAX_W, Math.max(MIN_W, ...entries.map(([, node]) => Math.round(Math.max(node.label.length * 8, (node.note?.length ?? 0) * 6.6) + 32))));
  const at = new Map<string, { x: number; y: number }>();
  const stacked = new Set<string>();
  let left = MARGIN;
  // A leaf takes the next column. Two or more leaves under one parent stack in its column, so wide teams stay narrow.
  // Any other parent sits over the middle of its children. Each call gives the center x of the node.
  const place = (id: string, y: number): number => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0 || (kids.length > 1 && kids.every(isLeaf))) {
      at.set(id, { x: left, y });
      kids.forEach((kid, index) => at.set(kid, { x: left + INDENT, y: y + (index + 1) * (h + STACK_GAP) }));
      if (kids.length > 0) stacked.add(id);
      left += w + (kids.length > 0 ? INDENT : 0) + GAP;
      return left - GAP - (kids.length > 0 ? INDENT : 0) - w / 2;
    }
    const centers = kids.map((kid) => place(kid, y + ROW));
    const cx = ((centers[0] ?? 0) + (centers.at(-1) ?? 0)) / 2;
    at.set(id, { x: cx - w / 2, y });
    return cx;
  };
  for (const [id, node] of entries) if (node.parent === undefined) place(id, TOP);

  const box = (id: string) => {
    const { x, y } = at.get(id) as { x: number; y: number };
    return { x, y, cx: x + w / 2 };
  };
  const width = left - GAP + MARGIN;
  const height = Math.max(...[...at.values()].map((point) => point.y)) + h + MARGIN;

  const lines = ids.flatMap((id) => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) return [];
    const top = box(id);
    if (stacked.has(id)) {
      const rail = top.x + INDENT / 2;
      const last = box(kids.at(-1) as string);
      return [`M${rail} ${top.y + h} V${last.y + h / 2}`, ...kids.map((kid) => `M${rail} ${box(kid).y + h / 2} H${box(kid).x}`)];
    }
    const mid = top.y + h + (ROW - h) / 2;
    const xs = kids.map((kid) => box(kid).cx);
    return [
      `M${top.cx} ${top.y + h} V${mid}`,
      ...(kids.length > 1 ? [`M${Math.min(...xs)} ${mid} H${Math.max(...xs)}`] : []),
      ...kids.map((kid) => `M${box(kid).cx} ${mid} V${box(kid).y}`),
    ];
  });

  const nodes: BoardNode[] = Object.entries(tree.nodes).map(([id, node]) => {
    const parent = node.parent === undefined ? undefined : tree.nodes[node.parent]?.label;
    const { x, y } = box(id);
    return {
      id,
      x,
      y,
      w,
      h,
      label: node.label,
      kind: "tree",
      eyebrow: parent === undefined ? tree.title : `${relation} ${parent}`,
      meta: parent ?? "",
      description: node.description,
      details: node.details,
      href: node.href,
      inner: node.note === undefined ? undefined : `<span>${esc(node.label)} <small>${esc(node.note)}</small></span>`,
    };
  });

  return renderBoard(
    {
      title: tree.title,
      width,
      height,
      svg: `<g class="docs-flow-edges">${lines.map((d) => `<path d="${d}"/>`).join("")}</g>`,
      nodes,
      connections: nodes.flatMap((node) => (node.meta === "" ? [] : [`${node.label}: ${relation} ${node.meta}`])),
      legend: [],
      columns: ["Node", relation],
    },
    context,
  );
}
