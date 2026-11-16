import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// The module runs in its own Node process, so each run reads the current files and no module cache goes stale.
// The result goes to file descriptor 3, so text that the module prints to stdout does not mix with it.
const RUNNER = `
import { writeSync } from "node:fs";
let value = await (await import(process.argv[1])).default;
const strings = JSON.parse(process.argv[2]);
if (strings) {
  if (!value || typeof value !== "object") throw new TypeError("the default export is not an object");
  const picked = {};
  for (const [name, required] of Object.entries(strings)) {
    const field = value[name];
    if (field === undefined && !required) continue;
    if (typeof field !== "string") throw new TypeError(\`the default export has \${field === undefined ? "no" : "a"} \${name} \${field === undefined ? "string" : "that is not a string"}\`);
    picked[name] = field;
  }
  value = picked;
}
writeSync(3, JSON.stringify(value === undefined ? null : value));
`;

/** The string fields to keep from the default export. A field is required when its value is true. */
export type StringFields = Record<string, boolean>;

export class ModuleError extends Error {}

/**
 * Runs a JavaScript module of the repo and gives its default export, as JSON.
 * With `strings`, the module process checks those fields and keeps only them, before JSON drops a function or fails on a BigInt.
 */
export function runModule(file: string, cwd: string, strings?: StringFields): unknown {
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", RUNNER, pathToFileURL(file).href, JSON.stringify(strings ?? null)], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe", "pipe"],
    timeout: 30_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error || run.status !== 0) {
    const reason = /^\w*Error(?: \[\w+\])?: (.+)$/m.exec(run.stderr ?? "")?.[1] ?? run.error?.message.split("\n")[0] ?? `the process stopped with code ${run.status}`;
    throw new ModuleError(`the module failed: ${reason}`);
  }
  const result = run.output[3];
  if (!result) throw new ModuleError("the module failed: it gave no result");
  return JSON.parse(result);
}
