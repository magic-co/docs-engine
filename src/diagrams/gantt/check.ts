import { timeTasks } from "./dates.ts";
import type { Gantt } from "./model.ts";

export function checkGantt(gantt: Gantt): string[] {
  const sections = Object.entries(gantt.tasks)
    .filter(([, task]) => !Object.hasOwn(gantt.sections, task.section))
    .map(([id, task]) => `task \`${id}\` names section \`${task.section}\`, which does not exist`);
  const empty = Object.keys(gantt.sections)
    .filter((id) => !Object.values(gantt.tasks).some((task) => task.section === id))
    .map((id) => `section \`${id}\` has no tasks`);
  return [...sections, ...empty, ...timeTasks(gantt).problems];
}
