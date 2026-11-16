import type { DiagramType } from "../types.ts";
import { checkGantt } from "./check.ts";
import schema from "./gantt.schema.json" with { type: "json" };
import type { Gantt } from "./model.ts";
import { renderGantt } from "./render.ts";

export const gantt: DiagramType<Gantt> = { schema, check: checkGantt, render: renderGantt };
