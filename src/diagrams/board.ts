// Parts of this file derive from diagram-design, Copyright (c) 2025 Cathryn Lavery, MIT License. See THIRD_PARTY_NOTICES.md.
import { esc } from "../render/html.ts";
import type { RenderContext } from "./types.ts";

/** Labelled facts in order. A list value prints as a bullet list. */
export type Details = Record<string, string | string[]>;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One focusable part of a diagram, placed in the coordinates of the board. */
export interface BoardNode extends Box {
  id: string;
  label: string;
  kind: string;
  /** The small line above the title in the hover card. */
  eyebrow: string;
  /** The text of the second column of the details table. */
  meta: string;
  description?: string;
  details?: Details;
  href?: string;
  /** The HTML inside the link. Default: the label. */
  inner?: string;
}

export interface Board {
  title: string;
  width: number;
  height: number;
  /** The SVG content under the nodes: lines, groups and labels. */
  svg: string;
  nodes: BoardNode[];
  /** One sentence for each connection, for screen readers. */
  connections: string[];
  /** The HTML of each legend item. */
  legend: string[];
  /** The heads of the first two columns of the details table. */
  columns: [string, string];
}

// The shared shape of each interactive diagram: an SVG under one absolutely placed, focusable node per part,
// a hover card for each node, a legend, and a details table that each node with facts links to.
export function renderBoard(board: Board, context: RenderContext): string {
  const { width, height } = board;
  const rows = new Map(board.nodes.filter(hasRow).map((node) => [node, context.anchor(`${context.id}-${node.id}`)]));
  const cards = board.nodes.map((node) => card(node, width, height, target(node, context, rows.get(node)))).join("");
  return (
    `<figure class="docs-flow-figure">` +
    `<figcaption>${esc(board.title)}</figcaption>` +
    `<div class="docs-flow-scroll"><docs-flow role="group" aria-label="${esc(board.title)}" style="aspect-ratio:${width}/${height};--w:${width}">` +
    `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${board.svg}</svg>${cards}</docs-flow></div>` +
    connections(board.connections) +
    legend(board.legend) +
    `</figure>` +
    (rows.size > 0 ? detailsTable(rows, board.columns) : "")
  );
}

function hasRow(node: BoardNode): boolean {
  return node.description !== undefined || (node.details !== undefined && Object.keys(node.details).length > 0);
}

function target(node: BoardNode, context: RenderContext, row: string | undefined): { href?: string; hint: string } {
  if (node.href !== undefined) return { href: context.href(node.href), hint: "Click to open the page" };
  if (row !== undefined) return { href: `#${row}`, hint: "Click to go to its row below" };
  return { hint: "" };
}

function card(node: BoardNode, width: number, height: number, link: { href?: string; hint: string }): string {
  const style = [`left:${pct(node.x, width)}`, `top:${pct(node.y, height)}`, `width:${pct(node.w, width)}`, `height:${pct(node.h, height)}`].join(";");
  const href = link.href === undefined ? "" : ` href="${esc(link.href)}"`;
  return (
    `<docs-flow-node value="${esc(node.id)}" data-kind="${esc(node.kind)}" style="${style}">` +
    `<ui-hover-card delay="250" close-delay="150"><ui-hover-card-trigger><a${href}>${node.inner ?? esc(node.label)}</a></ui-hover-card-trigger>` +
    `<ui-hover-card-content hidden side="bottom" side-offset="10" collision-padding="12"><ui-hover-card-arrow></ui-hover-card-arrow>` +
    `<p class="docs-card-kind">${esc(node.eyebrow)}</p><p class="docs-card-title">${esc(node.label)}</p>` +
    (node.description === undefined ? "" : `<p>${esc(node.description)}</p>`) +
    detailsList(node.details) +
    (link.hint ? `<p class="docs-card-hint">${link.hint}</p>` : "") +
    `</ui-hover-card-content></ui-hover-card></docs-flow-node>`
  );
}

export function detailsList(details: Details | undefined): string {
  const entries = Object.entries(details ?? {});
  if (entries.length === 0) return "";
  const value = (text: string | string[]) => (Array.isArray(text) ? `<ul>${text.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : esc(text));
  return `<dl>${entries.map(([term, text]) => `<dt>${esc(term)}</dt><dd>${value(text)}</dd>`).join("")}</dl>`;
}

function detailsTable(rows: Map<BoardNode, string>, columns: [string, string]): string {
  const body = [...rows]
    .map(
      ([node, row]) =>
        `<tr id="${esc(row)}"><td>${esc(node.label)}</td><td>${esc(node.meta)}</td>` +
        `<td>${node.description === undefined ? "" : `<p>${esc(node.description)}</p>`}${detailsList(node.details)}</td></tr>`,
    )
    .join("");
  return `<table class="docs-flow-details"><thead><tr><th>${esc(columns[0])}</th><th>${esc(columns[1])}</th><th>Description</th></tr></thead><tbody>${body}</tbody></table>`;
}

function connections(items: string[]): string {
  return items.length > 0 ? `<ul class="docs-flow-connections" aria-label="Connections">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : "";
}

function legend(items: string[]): string {
  return (
    `<div class="docs-flow-legend" aria-hidden="true">${items.length > 0 ? `<span>Legend</span>${items.join("")}` : ""}` +
    `<span class="docs-flow-keys">Hover or focus a part for details. Arrow keys move between parts.</span></div>`
  );
}

function pct(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(3)}%`;
}
