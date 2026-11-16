import { addDays, addMonths, daysBetween, formatDate, formatDateRange, startOfWeek } from "@ui-sdk/core/date";
import { esc } from "../../render/html.ts";
import { type BoardNode, renderBoard } from "../board.ts";
import type { RenderContext } from "../types.ts";
import { timeTasks } from "./dates.ts";
import type { Gantt, Timed } from "./model.ts";

const W = 880;
const LABEL_W = 280;
const PAD = 8;
const RIGHT = 16;
const AXIS = 46;
const SECTION = 28;
const ROW = 30;
const WEEKS_UNTIL = 120;
const MONTHS_UNTIL = 400;

interface Tick {
  date: string;
  major: boolean;
  label?: string;
}

export function renderGantt(gantt: Gantt, context: RenderContext): string {
  const { timed } = timeTasks(gantt);
  const { first, last, ticks } = axis(timed);
  const perDay = (W - LABEL_W - RIGHT) / daysBetween(first, last);
  const x = (date: string) => LABEL_W + daysBetween(first, date) * perDay;

  const zones: string[] = [];
  const nodes: BoardNode[] = [];
  let y = AXIS + 8;
  for (const [sectionId, section] of Object.entries(gantt.sections)) {
    const members = timed.filter((item) => item.task.section === sectionId);
    zones.push(
      `<rect class="docs-gantt-zone" x="${PAD - 2}" y="${y}" width="${W - 2 * PAD + 4}" height="${SECTION + members.length * ROW}" rx="6"/>` +
        `<text class="docs-flow-group-label" x="${PAD + 8}" y="${y + 18}">${esc(section.label.toUpperCase())}</text>`,
    );
    y += SECTION;
    for (const item of members) {
      nodes.push(node(item, section.label, y, x, timed));
      y += ROW;
    }
    y += 6;
  }
  const height = y + 8;

  const svg =
    zones.join("") +
    `<g class="docs-gantt-ticks">${ticks
      .map(
        (tick) =>
          `<line${tick.major ? ' class="docs-gantt-major"' : ""} x1="${round(x(tick.date))}" y1="${AXIS - (tick.major ? 14 : 6)}" x2="${round(x(tick.date))}" y2="${height - 8}"/>` +
          (tick.label ? `<text x="${round(x(tick.date) + 4)}" y="${AXIS - 6}">${esc(tick.label)}</text>` : ""),
      )
      .join("")}</g>` +
    `<line class="docs-gantt-axis" x1="${LABEL_W}" y1="${AXIS}" x2="${W - RIGHT}" y2="${AXIS}"/>`;

  const used = new Set(nodes.map((item) => item.kind));
  const legend = [
    ["gantt-task", "Task"],
    ["gantt-focal", "Focal task"],
    ["gantt-milestone", "Milestone"],
  ]
    .filter(([kind]) => used.has(kind as string))
    .map(([kind, label]) => `<span><i data-kind="${kind}"></i>${label}</span>`);

  return renderBoard(
    {
      title: gantt.title,
      width: W,
      height,
      svg,
      nodes,
      connections: timed.flatMap((item) => (item.task.after === undefined ? [] : [`${item.task.label} starts after ${gantt.tasks[item.task.after]?.label}`])),
      legend,
      columns: ["Task", "When"],
    },
    context,
  );
}

function node(item: Timed, section: string, y: number, x: (date: string) => number, timed: Timed[]): BoardNode {
  const { task } = item;
  const left = x(item.start);
  const right = item.milestone ? left : x(addDays(item.end, 1));
  const span = W - 2 * PAD;
  const mark = item.milestone
    ? `<span class="docs-gantt-mark" style="left:${pct(left - PAD, span)}"></span>`
    : `<span class="docs-gantt-bar" style="left:${pct(left - PAD, span)};width:${pct(Math.max(right - left, 3), span)}"></span>`;
  const after = task.after === undefined ? undefined : timed.find((other) => other.id === task.after)?.task.label;
  return {
    id: item.id,
    x: PAD,
    y,
    w: span,
    h: ROW,
    label: task.label,
    kind: item.milestone ? "gantt-milestone" : task.focal ? "gantt-focal" : "gantt-task",
    eyebrow: `${section} · ${item.milestone ? "Milestone" : "Task"}`,
    meta: when(item),
    description: task.description,
    details: { When: when(item), ...(after === undefined ? {} : { After: after }), ...task.details },
    href: task.href,
    inner: `<span class="docs-gantt-label" style="width:${pct(LABEL_W - PAD - 12, span)}">${esc(task.label)}</span>${mark}`,
  };
}

function when(item: Timed): string {
  if (item.milestone) return formatDate(item.start, "en-US", { month: "short", day: "numeric", year: "numeric" });
  const days = daysBetween(item.start, item.end) + 1;
  const length = days % 7 === 0 ? `${days / 7} week${days > 7 ? "s" : ""}` : `${days} day${days > 1 ? "s" : ""}`;
  return `${formatDateRange(item.start, item.end, "en-US")} (${length})`;
}

// Short spans get a tick each week. Longer spans get a tick each month, with a label each month or each quarter.
function axis(timed: Timed[]): { first: string; last: string; ticks: Tick[] } {
  const start = timed.reduce((min, item) => (item.start < min ? item.start : min), "9999-12-31");
  const end = addDays(timed.reduce((max, item) => (item.end > max ? item.end : max), "0000-01-01"), 1);
  const ticks: Tick[] = [];
  const month = (date: string, year: boolean) => formatDate(date, "en-US", { month: "short", ...(year ? { year: "numeric" } : {}) });
  if (daysBetween(start, end) <= WEEKS_UNTIL) {
    const first = startOfWeek(start, 1);
    const last = startOfWeek(addDays(end, 6), 1);
    for (let date = first; date <= last; date = addDays(date, 7)) {
      const newMonth = date === first || date.slice(5, 7) !== addDays(date, -7).slice(5, 7);
      ticks.push({ date, major: newMonth, label: newMonth ? `${month(date, date === first || date.slice(5, 7) === "01")} ${Number(date.slice(8))}` : String(Number(date.slice(8))) });
    }
    return { first, last, ticks };
  }
  const first = `${start.slice(0, 7)}-01`;
  const last = end.slice(8) === "01" ? end : addMonths(`${end.slice(0, 7)}-01`, 1);
  const quarterly = daysBetween(first, last) > MONTHS_UNTIL;
  for (let date = first; date <= last; date = addMonths(date, 1)) {
    const index = Number(date.slice(5, 7)) - 1;
    const labelled = !quarterly || index % 3 === 0;
    ticks.push({ date, major: index === 0 || date === first, label: labelled && date < last ? month(date, date === first || index === 0) : undefined });
  }
  return { first, last, ticks };
}

function pct(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(3)}%`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
