import { ASSETS_DIR, MANIFEST, NOT_FOUND } from "../../site/layout.ts";
import type { RepoPath, Route } from "../../site/types.ts";
import type { Rule } from "../types.ts";

export const routes: Rule = {
  id: "routes",
  severity: "error",
  check(site) {
    const sources = new Map<Route, RepoPath[]>();
    const found: { file: string; message: string }[] = [];
    for (const page of site.pages.values()) {
      if (page.route) sources.set(page.route, [...(sources.get(page.route) ?? []), page.path]);
      else if (page.area.visibility !== "hidden") {
        found.push({ file: page.path, message: "a folder or file name gives an empty, `.` or `..` route segment: rename it" });
      }
      const segments = page.route?.split("/").filter(Boolean) ?? [];
      if (segments.includes("index.html") || segments[0] === NOT_FOUND || segments[0] === MANIFEST) {
        found.push({ file: page.path, message: `a folder or file name gives the route segment \`index.html\`, or a first segment \`${NOT_FOUND}\` or \`${MANIFEST}\`, which are files of the build: rename it` });
      }
      if (page.route?.startsWith(`/${ASSETS_DIR}/`)) {
        found.push({ file: page.path, message: `the route \`/${ASSETS_DIR}/\` holds the client files of the build: rename the folder` });
      }
    }
    for (const [route, paths] of sources) {
      for (const path of paths) {
        const others = paths.filter((other) => other !== path).map((other) => `\`${other}\``);
        if (others.length > 0) found.push({ file: path, message: `the route \`${route}\` is also the route of ${others.join(" and ")}` });
      }
    }
    return found;
  },
};
