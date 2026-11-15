import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(import.meta.dirname, "../components", path), "utf8");
const css = read("site/site.css") + read("flow/flow.css");
const tokens = new Map([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\b/gi)].map((match) => [match[1]!, match[2]!]));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const textColors = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].flatMap(([, selector, body]) =>
  [...body!.matchAll(/(?:^|[;\s])(color|fill):\s*var\((--[\w-]+)\)/g)]
    .filter(([, property]) => property === "color" || !/(rect|polygon)\s*$/.test(selector!.trim()))
    .map(([, , token]) => ({ selector: selector!.trim(), token: token! })),
);

describe("text colors", () => {
  it.each(textColors)("$selector uses $token with a contrast of 4.5:1 or more on the page and on a card", ({ token }) => {
    const color = tokens.get(token);
    expect(color, token).toBeDefined();
    for (const background of ["--paper", "--card"]) expect(contrast(color!, tokens.get(background)!)).toBeGreaterThanOrEqual(4.5);
  });
});
