import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { Drawn } from "./model.ts";

// The result follows the last marker, so text that the module prints does not break it.
const MARKER = "\n@@docs-figure-result@@\n";

// The module runs in its own Node process, so each run reads the current files and no module cache goes stale.
const RUNNER = `
const figure = await (await import(process.argv[1])).default;
const text = (value, name) => {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("the default export has a " + name + " that is not a string");
  return value;
};
if (!figure || typeof figure !== "object") throw new Error("the default export is not an object");
const html = figure.html;
if (typeof html !== "string") throw new Error("the default export has no html string");
process.stdout.write(${JSON.stringify(MARKER)} + JSON.stringify({ html, script: text(figure.script, "script"), css: text(figure.css, "css") }));
`;

export class FigureError extends Error {}

export function runFigure(file: string, cwd: string): Drawn {
  try {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", RUNNER, pathToFileURL(file).href], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    const at = out.lastIndexOf(MARKER);
    if (at < 0) throw new FigureError("the module failed: it gave no result");
    return JSON.parse(out.slice(at + MARKER.length)) as Drawn;
  } catch (error) {
    if (error instanceof FigureError) throw error;
    const stderr = (error as { stderr?: string }).stderr ?? "";
    const reason = /^(?:\w*Error): (.+)$/m.exec(stderr)?.[1] ?? (error instanceof Error ? error.message.split("\n")[0] : String(error));
    throw new FigureError(`the module failed: ${reason}`);
  }
}
