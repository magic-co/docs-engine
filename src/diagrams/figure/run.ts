import { ModuleError, runModule } from "../module.ts";
import type { Drawn } from "./model.ts";

export function runFigure(file: string, cwd: string): Drawn {
  const figure = runModule(file, cwd);
  if (!figure || typeof figure !== "object") throw new ModuleError("the module failed: the default export is not an object");
  const { html, script, css } = figure as Record<string, unknown>;
  if (typeof html !== "string") throw new ModuleError("the module failed: the default export has no html string");
  return { html, script: text(script, "script"), css: text(css, "css") };
}

function text(value: unknown, name: string): string {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new ModuleError(`the module failed: the default export has a ${name} that is not a string`);
  return value;
}
