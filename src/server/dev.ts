import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { CLIENT_ENTRY, ENGINE_ROOT } from "../paths.ts";
import { respond } from "../render/site.ts";
import { CONFIG_FILE } from "../site/config.ts";
import { loadSite } from "../site/load.ts";
import type { Route, Site } from "../site/types.ts";
import { urlPathname } from "../site/url.ts";
import { THEME_RESOLVED, themePlugin } from "../theme.ts";

export const DEFAULT_PORT = 4173;
// Pages, schemas, and the modules and data files that figures read. Vite reloads the CSS of the theme itself.
const WATCHED = [".md", ".json", ".mjs", ".js", ".yaml", ".yml", ".svg"];
const HOST = "127.0.0.1";
const ENTRY = fsUrl(CLIENT_ENTRY);

export function fsUrl(path: string, windows = process.platform === "win32"): string {
  return `/@fs${pathToFileURL(path, { windows }).pathname}`;
}

// The client imports the CSS, but Vite adds it only after the script runs. A <link> per stylesheet lets the browser
// draw each page with its styles, as the build does. Vite still swaps the styles in place when a file changes.
async function head(server: ViteDevServer): Promise<string> {
  const links = (await stylesheets(server, ENTRY, new Set())).map((url) => `<link rel="stylesheet" href="${url}">`);
  return [...links, `<script type="module" src="${ENTRY}"></script>`].join("\n");
}

// The CSS that a module imports, in import order, through the modules it imports.
async function stylesheets(server: ViteDevServer, url: string, seen: Set<string>): Promise<string[]> {
  await server.transformRequest(url);
  const module = await server.moduleGraph.getModuleByUrl(url);
  const found: string[] = [];
  for (const imported of module?.importedModules ?? []) {
    if (seen.has(imported.url)) continue;
    seen.add(imported.url);
    if (imported.file?.endsWith(".css")) found.push(imported.url);
    else found.push(...(await stylesheets(server, imported.url, seen)));
  }
  return found;
}

export interface DevServer {
  url: string;
  close(): Promise<void>;
}

export async function startDev(options: { root: string; port: number; log?: (line: string) => void }): Promise<DevServer> {
  const log = options.log ?? (() => {});
  const server = await createServer({
    configFile: false,
    root: options.root,
    appType: "custom",
    clearScreen: false,
    logLevel: "warn",
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: HOST, port: options.port, strictPort: false, fs: { allow: [options.root, ENGINE_ROOT] } },
    plugins: docsPlugins(options.root, log),
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? `http://${HOST}:${options.port}/`;
  return { url, close: () => server.close() };
}

function docsPlugins(root: string, log: (line: string) => void): Plugin[] {
  const state: { site: Site } = { site: loadSite(root) };
  return [docsPlugin(root, state, log), themePlugin(() => state.site)];
}

function docsPlugin(root: string, state: { site: Site }, log: (line: string) => void): Plugin {
  const watched = (file: string) => WATCHED.some((end) => file.endsWith(end)) || file.endsWith(`/${CONFIG_FILE}`);
  return {
    name: "docs-engine",
    configureServer(server: ViteDevServer) {
      server.watcher.on("all", (_event, file) => {
        if (!watched(file)) return;
        try {
          state.site = loadSite(root);
        } catch (error) {
          log(`docs: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
        const theme = server.moduleGraph.getModuleById(THEME_RESOLVED);
        if (theme) server.moduleGraph.invalidateModule(theme);
        server.ws.send({ type: "full-reload", path: "*" });
      });
      server.middlewares.use(async (request, response, next) => {
        let pathname: string;
        try {
          pathname = urlPathname(new URL(request.url ?? "/", "http://localhost").pathname);
        } catch {
          response.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Bad request: the URL is malformed.\n");
          return;
        }
        const site = state.site;
        const known = site.routes.has(pathname as Route) || site.routes.has(`${pathname}/` as Route);
        if (pathname.startsWith("/@") || (extname(pathname) !== "" && !known)) return next();
        try {
          const result = respond(site, pathname, await head(server));
          if (result.status === 301) {
            response.writeHead(301, { location: result.location }).end();
            return;
          }
          const html = await server.transformIndexHtml(pathname, result.html);
          response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" }).end(html);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
