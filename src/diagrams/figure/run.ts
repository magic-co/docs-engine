import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import type { Drawn } from "./model.ts";

// The module runs in its own Node process, so each run reads the current files and no module cache goes stale.
// The result goes to file descriptor 3, so text that the module prints to stdout does not mix with it.
const RUNNER = `
import { writeSync } from "node:fs";
const figure = await (await import(process.argv[1])).default;
const text = (value, name) => {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new Error("the default export has a " + name + " that is not a string");
  return value;
};
if (!figure || typeof figure !== "object") throw new Error("the default export is not an object");
const html = figure.html;
if (typeof html !== "string") throw new Error("the default export has no html string");
writeSync(3, JSON.stringify({ html, script: text(figure.script, "script"), css: text(figure.css, "css") }));
`;

export class FigureError extends Error {}

export function runFigure(file: string, cwd: string): Drawn {
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", RUNNER, pathToFileURL(file).href], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe", "pipe"],
    timeout: 30_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error || run.status !== 0) {
    const reason = /^(?:\w*Error): (.+)$/m.exec(run.stderr ?? "")?.[1] ?? run.error?.message.split("\n")[0] ?? `the process stopped with code ${run.status}`;
    throw new FigureError(`the module failed: ${reason}`);
  }
  const result = run.output[3];
  if (!result) throw new FigureError("the module failed: it gave no result");
  return JSON.parse(result) as Drawn;
}
