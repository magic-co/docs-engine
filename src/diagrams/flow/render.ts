// Parts of this file derive from diagram-design, Copyright (c) 2025 Cathryn Lavery, MIT License. See THIRD_PARTY_NOTICES.md.
import { esc } from "../../render/html.ts";
import { type Box, renderBoard } from "../board.ts";
import type { RenderContext } from "../types.ts";
import { type Flow, type FlowEdge, type FlowNode, type Kind, KINDS } from "./model.ts";

const COL = 176;
const ROW = 104;
const LEFT = 90;
const TOP = 48;
const H = 48;
const MIN_W = 96;
const LINE = 11;
const MARGIN = 24;
const GROUP_PAD = 14;

interface Placed extends Box {
  id: string;
  node: FlowNode;
  cx: number;
  cy: number;
}

export function renderFlow(flow: Flow, context: RenderContext): string {
  const nodes = shiftRight(Object.entries(flow.nodes).map(([id, node]) => place(id, node)));
  const byId = new Map(nodes.map((placed) => [placed.id, placed]));
  const groups = new Map(
    Object.entries(flow.groups ?? {}).map(([id, group]) => [id, { label: group.label, ...groupBox(id, nodes, flow.edges, byId) }]),
  );
  const width = Math.max(...nodes.map((n) => n.x + n.w), ...[...groups.values()].map((g) => g.x + g.w)) + MARGIN;
  const height = Math.max(...nodes.map((n) => n.y + n.h), ...[...groups.values()].map((g) => g.y + g.h)) + MARGIN;
  const edges = flow.edges.map((edge) => drawEdge(edge, byId, groups));
  const arrow = context.anchor(`${context.id}-arrow`);

  const svg =
    `<defs><marker id="${arrow}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6"/></marker></defs>` +
    [...groups.values()]
      .map((g) => `<rect class="docs-flow-group" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"/><text class="docs-flow-group-label" x="${g.x + 14}" y="${g.y + 20}">${esc(g.label.toUpperCase())}</text>`)
      .join("") +
    `<g class="docs-flow-edges">${edges.map((e) => `<path d="${e.d}"${e.side ? ' stroke-dasharray="5,4"' : ""} marker-end="url(#${arrow})"/>`).join("")}</g>` +
    `<g class="docs-flow-edge-labels">${edges.map((e) => e.label).join("")}</g>`;

  return renderBoard(
    {
      title: flow.title,
      width,
      height,
      svg,
      nodes: nodes.map(({ id, node, x, y, w, h }) => ({
        id,
        x,
        y,
        w,
        h,
        label: node.label,
        kind: node.kind,
        eyebrow: KINDS[node.kind],
        meta: KINDS[node.kind],
        description: node.description,
        details: node.details,
        href: node.href,
      })),
      connections: connections(flow),
      legend: legend(flow, groups.size > 0),
      columns: ["Node", "Kind"],
    },
    context,
  );
}

function place(id: string, node: FlowNode): Placed {
  const pad = node.kind === "decision" ? 64 : 32;
  const w = Math.max(MIN_W, Math.round(node.label.length * 7.4 + pad));
  const cx = LEFT + node.at[0] * COL;
  const y = TOP + node.at[1] * ROW;
  return { id, node, w, h: H, cx, cy: y + H / 2, x: cx - w / 2, y };
}

function shiftRight(nodes: Placed[]): Placed[] {
  const dx = Math.max(0, MARGIN + GROUP_PAD - Math.min(...nodes.map((n) => n.x)));
  return dx === 0 ? nodes : nodes.map((n) => ({ ...n, x: n.x + dx, cx: n.cx + dx }));
}

function groupBox(id: string, nodes: Placed[], edges: FlowEdge[], byId: Map<string, Placed>): Box {
  const members = nodes.filter(({ node }) => node.group === id);
  const sources = edges.flatMap((edge) => (edge.to === id ? (byId.get(edge.from) ?? []) : []));
  const left = Math.min(...members.map((n) => n.x), ...sources.map((n) => n.cx - 48)) - GROUP_PAD;
  const right = Math.max(...members.map((n) => n.x + n.w), ...sources.map((n) => n.cx + 48)) + GROUP_PAD;
  const top = Math.min(...members.map((n) => n.y)) - 34;
  const bottom = Math.max(...members.map((n) => n.y + n.h)) + 18;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function drawEdge(edge: FlowEdge, byId: Map<string, Placed>, groups: Map<string, Box>): { d: string; side: boolean; label: string } {
  const a = byId.get(edge.from) as Placed;
  const b: Box & { cx: number; cy: number } = byId.get(edge.to) ?? centered(groups.get(edge.to) as Box);
  const side = edge.side === true;
  if (Math.abs(a.cy - b.cy) < 1) {
    const right = b.cx > a.cx;
    const x1 = right ? a.x + a.w : a.x;
    const x2 = right ? b.x - 2 : b.x + b.w + 2;
    return { d: `M${x1} ${a.cy} H${x2}`, side, label: edge.label ? labelAbove(edge.label, (x1 + x2) / 2, a.cy, fit(Math.abs(x2 - x1))) : "" };
  }
  const down = b.cy > a.cy;
  const y1 = down ? a.y + a.h : a.y;
  const y2 = down ? b.y - 2 : b.y + b.h + 2;
  const mid = (y1 + y2) / 2;
  if (Math.abs(a.cx - b.cx) < 1 || !byId.has(edge.to)) {
    return { d: `M${a.cx} ${y1} V${y2}`, side, label: edge.label ? labelBeside(edge.label, a.cx, mid) : "" };
  }
  return {
    d: `M${a.cx} ${y1} V${mid} H${b.cx} V${y2}`,
    side,
    label: edge.label ? labelAbove(edge.label, (a.cx + b.cx) / 2, mid) : "",
  };
}

function centered(box: Box): Box & { cx: number; cy: number } {
  return { ...box, cx: box.x + box.w / 2, cy: box.y + box.h / 2 };
}

function labelAbove(text: string, x: number, y: number, max = 16): string {
  const lines = wrap(text, max);
  const w = Math.max(...lines.map(monoWidth)) + 8;
  const top = y - 6 - lines.length * LINE;
  const spans = lines.map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : LINE}">${esc(line)}</tspan>`).join("");
  return `<rect x="${round(x - w / 2)}" y="${top}" width="${round(w)}" height="${lines.length * LINE + 2}"/><text x="${x}" y="${top + 9}">${spans}</text>`;
}

function labelBeside(text: string, x: number, y: number): string {
  const w = monoWidth(text) + 8;
  return `<rect x="${x + 6}" y="${y - 8}" width="${round(w)}" height="12"/><text x="${x + 10}" y="${y + 1}" text-anchor="start">${esc(text)}</text>`;
}

// A label over a short horizontal edge wraps to the width of the gap, so it does not run under the nodes.
function fit(gap: number): number {
  return Math.max(6, Math.min(16, Math.floor((gap - 8) / 5.6)));
}

function wrap(text: string, max = 16): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function monoWidth(text: string): number {
  return text.length * 5.6;
}

function connections(flow: Flow): string[] {
  const name = (id: string) => flow.nodes[id]?.label ?? flow.groups?.[id]?.label ?? id;
  return flow.edges.map((edge) => {
    const label = [edge.label, edge.side ? "side path" : undefined].filter(Boolean).join(", ");
    return `${name(edge.from)} to ${name(edge.to)}${label ? `: ${label}` : ""}`;
  });
}

function legend(flow: Flow, hasGroups: boolean): string[] {
  const used = new Set(Object.values(flow.nodes).map((node) => node.kind));
  const kinds = (Object.keys(KINDS) as Kind[]).filter((kind) => used.has(kind));
  return [
    ...kinds.map((kind) => `<span><i data-kind="${kind}"></i>${KINDS[kind]}</span>`),
    ...(flow.edges.some((edge) => edge.side) ? [`<span><i class="docs-legend-dash"></i>Side path</span>`] : []),
    ...(hasGroups ? [`<span><i data-kind="group"></i>Group</span>`] : []),
  ];
}
