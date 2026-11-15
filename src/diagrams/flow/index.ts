import type { DiagramType } from "../types.ts";
import { checkFlow } from "./check.ts";
import schema from "./flow.schema.json" with { type: "json" };
import type { Flow } from "./model.ts";
import { renderFlow } from "./render.ts";

export const flow: DiagramType<Flow> = { schema, check: checkFlow, render: renderFlow };
