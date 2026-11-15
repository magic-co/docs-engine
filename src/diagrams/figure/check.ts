import type { Figure } from "./model.ts";

export function checkFigure(figure: Figure): string[] {
  if (figure.source !== undefined && figure.illustration) return ["a figure has a `source` or `illustration: true`, not both"];
  if (figure.source === undefined && !figure.illustration) return ["a figure needs a `source`, or `illustration: true` when it states no facts"];
  return [];
}
