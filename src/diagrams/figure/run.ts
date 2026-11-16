import { runModule } from "../module.ts";
import type { Drawn } from "./model.ts";

export function runFigure(file: string, cwd: string): Drawn {
  const { html, script = "", css = "" } = runModule(file, cwd, { html: true, script: false, css: false }) as Partial<Drawn>;
  return { html: html ?? "", script, css };
}
