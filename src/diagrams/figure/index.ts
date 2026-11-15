import type { DiagramType } from "../types.ts";
import { checkFigure } from "./check.ts";
import schema from "./figure.schema.json" with { type: "json" };
import type { Figure } from "./model.ts";
import { renderFigure } from "./render.ts";

export const figure: DiagramType<Figure> = { schema, check: checkFigure, render: renderFigure };
