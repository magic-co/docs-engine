import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { build } from "vite";
import { hasErrors, lint } from "./lint/index.ts";
import { CLIENT_ENTRY, ENGINE_ROOT } from "./paths.ts";
import { notFound, renderPage } from "./render/site.ts";
import { loadSite } from "./site/load.ts";
import type { Finding } from "./site/types.ts";

const HEAD = `<link rel="stylesheet" href="/assets/client.css">\n<script type="module" src="/assets/client.js"></script>`;
const MANIFEST = ".docs-engine-manifest.json";

export async function buildSite(options: { root: string; out: string }): Promise<{ findings: Finding[]; pages: number }> {
  const site = loadSite(options.root);
  const findings = lint(site);
  if (hasErrors(findings)) return { findings, pages: 0 };
  const files = new Map<string, string>([["404.html", notFound(site, HEAD)]]);
  for (const page of site.routes.values()) {
    files.set(posix.join(...(page.route ?? "/").split("/").filter(Boolean), "index.html"), renderPage(site, page, HEAD));
  }
  const stale = readManifest(options.out).filter((file) => !files.has(file));
  for (const [file, html] of files) {
    mkdirSync(dirname(join(options.out, file)), { recursive: true });
    writeFileSync(join(options.out, file), html);
  }
  for (const file of stale) removeWithEmptyParents(options.out, file);
  writeFileSync(join(options.out, MANIFEST), `${JSON.stringify([...files.keys()].sort(), null, 2)}\n`);
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

function readManifest(out: string): string[] {
  const file = join(out, MANIFEST);
  if (!existsSync(file)) return [];
  let list: unknown;
  try {
    list = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  return Array.isArray(list) ? list.filter(isOwnPage) : [];
}

// Someone may edit the manifest, so a listed path may only name an HTML file inside the output folder.
function isOwnPage(path: unknown): path is string {
  return typeof path === "string" && path.endsWith(".html") && posix.normalize(path) === path && !path.startsWith("../") && !path.startsWith("/");
}

function removeWithEmptyParents(out: string, file: string): void {
  rmSync(join(out, file), { force: true });
  for (let dir = posix.dirname(file); dir !== "."; dir = posix.dirname(dir)) {
    const path = join(out, dir);
    if (!existsSync(path) || readdirSync(path).length > 0) return;
    rmdirSync(path);
  }
}
