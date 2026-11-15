import { existsSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { DOCS_DIR, LAYOUT } from "../../site/layout.ts";
import type { Rule } from "../types.ts";

export const layout: Rule = {
  id: "layout",
  severity: "error",
  check(site) {
    const missing = LAYOUT.flatMap(({ place, required }) => {
      if (!required || place.kind === "any-folder") return [];
      const full = join(site.root, place.path);
      const ok = existsSync(full) && statSync(full).isDirectory() === (place.kind === "folder");
      return ok ? [] : [{ file: place.path, message: `the ${place.kind} \`${place.path}\` must exist` }];
    });
    const docs = join(site.root, DOCS_DIR);
    const loose = existsSync(docs)
      ? readdirSync(docs, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
          .map((entry) => ({
            file: posix.join(DOCS_DIR, entry.name),
            message: `a page directly in \`${DOCS_DIR}/\` is not allowed: move it into a section folder`,
          }))
      : [];
    return [...missing, ...loose];
  },
};
