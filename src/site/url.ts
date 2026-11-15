import type { Route } from "./types.ts";

export function routeUrl(route: Route): string {
  return route.split("/").map(encodeURIComponent).join("/");
}

export function urlPathname(pathname: string): string {
  return pathname.split("/").map(decodeURIComponent).join("/");
}
