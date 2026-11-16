import { esc } from "../../render/html.ts";
import { type BoardNode, renderBoard } from "../board.ts";
import type { RenderContext } from "../types.ts";
import type { Tree } from "./model.ts";

const GAP = 24;
const ROW = 104;
const TOP = 24;
const MARGIN = 24;
const MIN_W = 120;

interface Slot {
  id: string;
  column: number;
  depth: number;
}

export function renderTree(tree: Tree, context: RenderContext): string {
  const relation = tree.relation ?? "Under";
  const entries = Object.entries(tree.nodes);
  const ids = entries.map(([id]) => id);
  const children = new Map(ids.map((id) => [id, entries.filter(([, node]) => node.parent === id).map(([child]) => child)]));
  const slots = new Map<string, Slot>();
  let next = 0;
  // A leaf takes the next column. A parent sits over the middle of its children.
  const place = (id: string, depth: number): number => {
    const kids = children.get(id) ?? [];
    const columns = kids.map((kid) => place(kid, depth + 1));
    const first = columns[0];
    const last = columns.at(-1);
    const column = first === undefined || last === undefined ? next++ : (first + last) / 2;
    slots.set(id, { id, column, depth });
    return column;
  };
  for (const [id, node] of entries) if (node.parent === undefined) place(id, 0);

  const h = entries.some(([, node]) => node.note !== undefined) ? 60 : 48;
  const w = Math.max(MIN_W, ...entries.map(([, node]) => Math.round(Math.max(node.label.length * 8, (node.note?.length ?? 0) * 6.6) + 32)));
  const step = w + GAP;
  const depth = Math.max(...[...slots.values()].map((slot) => slot.depth));
  const width = MARGIN * 2 + next * step - GAP;
  const height = TOP + depth * ROW + h + MARGIN;
  const box = (id: string) => {
    const slot = slots.get(id) as Slot;
    const cx = MARGIN + w / 2 + slot.column * step;
    const y = TOP + slot.depth * ROW;
    return { cx, x: cx - w / 2, y };
  };

  const lines = ids.flatMap((id) => {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) return [];
    const top = box(id);
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
