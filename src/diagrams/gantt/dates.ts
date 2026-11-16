import { addDays, daysBetween, isISODate } from "@ui-sdk/core/date";
import type { Gantt, Timed } from "./model.ts";

/** Works out the start and the end of each task, in task order. Gives the problems instead when a date cannot be found. */
export function timeTasks(gantt: Gantt): { timed: Timed[]; problems: string[] } {
  const done = new Map<string, Timed>();
  const failed = new Set<string>();
  const problems: string[] = [];
  const visit = (id: string, path: string[]): Timed | undefined => {
    const known = done.get(id);
    if (known) return known;
    const task = gantt.tasks[id];
    if (!task || failed.has(id)) return undefined;
    if (path.includes(id)) {
      for (const step of path.slice(path.indexOf(id))) failed.add(step);
      problems.push(`the \`after\` of ${[...path.slice(path.indexOf(id)), id].map((step) => `\`${step}\``).join(" to ")} makes a loop`);
      return undefined;
    }
    for (const [field, value] of [["on", task.on], ["start", task.start], ["end", task.end]] as const) {
      if (value !== undefined && !isISODate(value)) {
        problems.push(`task \`${id}\` has \`${field}: ${value}\`, which is not a real date`);
        return undefined;
      }
    }
    const starts = (["on", "start", "after"] as const).filter((field) => task[field] !== undefined);
    const ends = (["end", "days", "weeks"] as const).filter((field) => task[field] !== undefined);
    if (starts.length !== 1) {
      problems.push(`task \`${id}\` needs one of \`on\`, \`start\` or \`after\`${starts.length > 1 ? `, not ${starts.map((field) => `\`${field}\``).join(" and ")}` : ""}`);
      return undefined;
    }
    if (ends.length > 1 || (task.on !== undefined && ends.length > 0)) {
      problems.push(`task \`${id}\` has ${[...(task.on === undefined ? [] : ["on"]), ...ends].map((field) => `\`${field}\``).join(" and ")}. Give one end: \`end\`, \`days\` or \`weeks\`, or none for a milestone`);
      return undefined;
    }
    let start = task.on ?? task.start;
    const hasEnd = task.end !== undefined || task.days !== undefined || task.weeks !== undefined;
    if (task.after !== undefined) {
      if (!Object.hasOwn(gantt.tasks, task.after)) {
        problems.push(`task \`${id}\` is after \`${task.after}\`, which is not a task`);
        return undefined;
      }
      const before = visit(task.after, [...path, id]);
      if (!before) return undefined;
      start = hasEnd ? addDays(before.end, 1) : before.end;
    }
    if (start === undefined) return undefined;
    const end = task.end ?? (task.days !== undefined ? addDays(start, task.days - 1) : task.weeks !== undefined ? addDays(start, task.weeks * 7 - 1) : start);
    if (daysBetween(start, end) < 0) {
      problems.push(`task \`${id}\` ends on ${end}, before it starts on ${start}`);
      return undefined;
    }
    const timed = { id, task, start, end, milestone: !hasEnd };
    done.set(id, timed);
    return timed;
  };
  for (const id of Object.keys(gantt.tasks)) if (!visit(id, [])) failed.add(id);
  return { timed: Object.keys(gantt.tasks).flatMap((id) => done.get(id) ?? []), problems };
}
