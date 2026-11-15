import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";
import { hasErrors, lint } from "./lint/index.ts";
import { CLIENT_ENTRY, ENGINE_ROOT } from "./paths.ts";
import { notFound, renderPage } from "./render/site.ts";
import { loadSite } from "./site/load.ts";
import type { Finding } from "./site/types.ts";

const HEAD = `<link rel="stylesheet" href="/assets/client.css">\n<script type="module" src="/assets/client.js"></script>`;

export async function buildSite(options: { root: string; out: string }): Promise<{ findings: Finding[]; pages: number }> {
  const site = loadSite(options.root);
  const findings = lint(site);
  if (hasErrors(findings)) return { findings, pages: 0 };
  for (const page of site.routes.values()) {
    const dir = join(options.out, ...(page.route ?? "/").split("/").filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), renderPage(site, page, HEAD));
  }
  writeFileSync(join(options.out, "404.html"), notFound(site, HEAD));
  await build({
    configFile: false,
    root: ENGINE_ROOT,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: join(options.out, "assets"),
      emptyOutDir: true,
      lib: { entry: CLIENT_ENTRY, formats: ["es"], fileName: () => "client.js", cssFileName: "client" },
    },
  });
  return { findings, pages: site.routes.size };
}
