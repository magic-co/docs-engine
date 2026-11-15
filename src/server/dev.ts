import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { CLIENT_ENTRY, ENGINE_ROOT } from "../paths.ts";
import { respond } from "../render/site.ts";
import { CONFIG_FILE } from "../site/config.ts";
import { loadSite } from "../site/load.ts";
import type { Route, Site } from "../site/types.ts";
import { urlPathname } from "../site/url.ts";

export const DEFAULT_PORT = 4173;
const HOST = "127.0.0.1";
const HEAD = `<script type="module" src="${fsUrl(CLIENT_ENTRY)}"></script>`;

export function fsUrl(path: string, windows = process.platform === "win32"): string {
  return `/@fs${pathToFileURL(path, { windows }).pathname}`;
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
    plugins: [docsPlugin(options.root, log)],
  });
  await server.listen();
  const url = server.resolvedUrls?.local[0] ?? `http://${HOST}:${options.port}/`;
  return { url, close: () => server.close() };
}

function docsPlugin(root: string, log: (line: string) => void): Plugin {
  let site: Site = loadSite(root);
  const watched = (file: string) => file.endsWith(".md") || file.endsWith(`/${CONFIG_FILE}`) || file.endsWith(".schema.json");
  return {
    name: "docs-engine",
    configureServer(server: ViteDevServer) {
      server.watcher.on("all", (_event, file) => {
        if (!watched(file)) return;
        try {
          site = loadSite(root);
        } catch (error) {
          log(`docs: ${error instanceof Error ? error.message : String(error)}`);
          return;
        }
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
        const known = site.routes.has(pathname as Route) || site.routes.has(`${pathname}/` as Route);
        if (pathname.startsWith("/@") || (extname(pathname) !== "" && !known)) return next();
        try {
          const result = respond(site, pathname, HEAD);
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
