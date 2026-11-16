import { join } from "node:path";
import type { Plugin } from "vite";
import type { Site } from "./site/types.ts";

export const THEME_MODULE = "virtual:docs-theme";
export const THEME_RESOLVED = `\0${THEME_MODULE}`;

// The client imports the theme module last, so the CSS of the repo comes after the default theme and wins.
export function themePlugin(site: () => Site): Plugin {
  return {
    name: "docs-engine-theme",
    resolveId: (id) => (id === THEME_MODULE ? THEME_RESOLVED : undefined),
    load(id) {
      if (id !== THEME_RESOLVED) return undefined;
      const { root, config } = site();
      if (!config.theme) return "";
      const file = join(root, config.theme);
      this.addWatchFile(file);
      return `import ${JSON.stringify(file)};`;
    },
  };
}
