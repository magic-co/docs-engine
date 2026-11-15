import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach } from "vitest";

import { CLEAN, type Files } from "./clean-repo.ts";

export { CLEAN, type Files };

const made: string[] = [];

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

export function repo(changes: Files = {}): string {
  const root = mkdtempSync(join(tmpdir(), "docs-engine-"));
  made.push(root);
  for (const [path, text] of Object.entries({ ...CLEAN, ...changes })) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
