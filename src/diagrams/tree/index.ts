import type { DiagramType } from "../types.ts";
import { checkTree } from "./check.ts";
import type { Tree } from "./model.ts";
import { renderTree } from "./render.ts";
import schema from "./tree.schema.json" with { type: "json" };

export const tree: DiagramType<Tree> = { schema, check: checkTree, render: renderTree };
