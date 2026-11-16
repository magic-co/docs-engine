import { ConfigError } from "./config.ts";
import type { Route, Site } from "./types.ts";

export function routeUrl(site: Pick<Site, "base">, route: Route): string {
  return `${site.base}${route.slice(1).split("/").map(encodeURIComponent).join("/")}`;
}

export function checkBase(base: string): string {
  if (!base.startsWith("/") || !base.endsWith("/") || base.includes("//") || /[?#\s]/.test(base)) {
    throw new ConfigError(`the base path must start and end with "/", as in "/repo/", not "${base}"`);
  }
  return base;
}

export function urlPathname(pathname: string): string {
  return pathname.split("/").map(decodeURIComponent).join("/");
}
