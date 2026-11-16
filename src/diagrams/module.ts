import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// The module runs in its own Node process, so each run reads the current files and no module cache goes stale.
// The result goes to file descriptor 3, so text that the module prints to stdout does not mix with it.
const RUNNER = `
import { writeSync } from "node:fs";
const value = await (await import(process.argv[1])).default;
writeSync(3, JSON.stringify(value === undefined ? null : value));
`;

export class ModuleError extends Error {}

/** Runs a JavaScript module of the repo and gives its default export, as JSON. */
export function runModule(file: string, cwd: string): unknown {
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", RUNNER, pathToFileURL(file).href], {
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
