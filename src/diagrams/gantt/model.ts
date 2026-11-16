import type { Details } from "../board.ts";

export interface GanttTask {
  label: string;
  section: string;
  on?: string;
  start?: string;
  after?: string;
  end?: string;
  days?: number;
  weeks?: number;
  focal?: boolean;
  description?: string;
  details?: Details;
  href?: string;
}

export interface Gantt {
  title: string;
  sections: Record<string, { label: string }>;
  tasks: Record<string, GanttTask>;
}

/** A task with its dates worked out. `end` is the last day, inclusive. */
export interface Timed {
  id: string;
  task: GanttTask;
  start: string;
  end: string;
  milestone: boolean;
}
