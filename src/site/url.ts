import { ConfigError } from "./config.ts";
import type { Route, Site } from "./types.ts";

export function routeUrl(site: Pick<Site, "base">, route: Route): string {
  return `${site.base}${route.slice(1).split("/").map(encodeURIComponent).join("/")}`;
}

// Only URL path characters that need no escaping, so the base is safe in a URL and in an HTML attribute.
const BASE = /^\/(?:[A-Za-z0-9._~-]+\/)*$/;

export function checkBase(base: string): string {
  if (!BASE.test(base)) {
    throw new ConfigError(`the base path must start and end with "/" and hold only letters, digits and . _ ~ -, as in "/repo/", not "${base}"`);
  }
  return base;
}

export function urlPathname(pathname: string): string {
  return pathname.split("/").map(decodeURIComponent).join("/");
}
