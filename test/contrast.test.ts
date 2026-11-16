import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(import.meta.dirname, "../components", path), "utf8");
const css = read("site/tokens.css") + read("site/site.css") + read("flow/flow.css") + read("flow/gantt.css");
const NO_TEXT = new Set(["none", "transparent", "inherit", "currentcolor"]);
const SHAPE = /(rect|polygon|\.docs-flow-group)$/;

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

function longHex(value: string): string | undefined {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  return undefined;
}

function textColors(source: string): { selector: string; value: string; color?: string }[] {
  const tokens = new Map([...source.matchAll(/(--[\w-]+):\s*(#[\da-f]{3,6})\b/gi)].map((match) => [match[1]!, longHex(match[2]!)]));
  return [...source.matchAll(/([^{}]+)\{([^}]*)\}/g)].flatMap(([, selector, body]) =>
    [...body!.matchAll(/(?:^|[;\s])(color|fill):\s*([^;}]+?)\s*(?=;|$)/g)]
      .filter(([, property, value]) => !NO_TEXT.has(value!.toLowerCase()) && (property === "color" || !SHAPE.test(selector!.trim())))
      .map(([, , value]) => {
        const token = /^var\((--[\w-]+)\)$/.exec(value!)?.[1];
        return { selector: selector!.trim(), value: value!, color: token ? tokens.get(token) : longHex(value!) };
      }),
  );
}

function readable(source: string): (entry: { color?: string }) => boolean {
  const backgrounds = ["--paper", "--card"].map((token) => textColors(`a { color: var(${token}) }${source}`)[0]!.color);
  return ({ color }) => color !== undefined && backgrounds.every((background) => background !== undefined && contrast(color, background) >= 4.5);
}

describe("text colors", () => {
  const ok = readable(css);

  it.each(textColors(css))("$selector uses $value with a contrast of 4.5:1 or more on the page and on a card", (entry) => {
    expect(ok(entry), entry.value).toBe(true);
  });

  it("checks literal colors as well as tokens", () => {
    const sample = ":root { --paper: #ffffff; --card: #fff; --ink: #222; }\n.a { color: #bbb; }\n.b { color: var(--ink); }\n.c { color: #111111; }\n.d { color: red; }\n.e {color:#222;fill:#fff;}";
    expect(textColors(sample).map((entry) => [entry.selector, readable(sample)(entry)])).toEqual([
      [".a", false],
      [".b", true],
      [".c", true],
      [".d", false],
      [".e", true],
      [".e", false],
    ]);
  });
});
