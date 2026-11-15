import { esc } from "../../render/html.ts";
import type { RenderContext } from "../types.ts";
import type { Figure } from "./model.ts";
import { FigureError, runFigure } from "./run.ts";

export function renderFigure(figure: Figure, context: RenderContext): string {
  const file = context.file(figure.module);
  if (!file) return problem(`the module \`${figure.module}\` does not exist in the repo`);
  let drawn;
  try {
    drawn = runFigure(file, context.root);
  } catch (error) {
    if (error instanceof FigureError) return problem(error.message);
    throw error;
  }
  const css = drawn.css ? `<style>${drawn.css.replace(/<\/(style)/gi, "<\\/$1")}</style>` : "";
  const script = drawn.script ? `<script type="module">${drawn.script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : "";
  return `<div class="docs-figure" id="${esc(context.id)}">${css}${drawn.html}${script}</div>`;
}

function problem(message: string): string {
  return `<div class="docs-diagram-error" role="alert"><p>This <code>figure</code> has an error: ${esc(message)}</p></div>`;
}
