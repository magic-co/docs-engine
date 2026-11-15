import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PREFIX = "<!-- docs-engine:generated";
const MARK = /^<!-- docs-engine:generated source=(\S+) sha256=([0-9a-f]{64}) -->\n/;

export type GeneratedMark =
  | { status: "intact" | "edited"; source: string }
  | { status: "malformed" };

export function readGeneratedMark(text: string): GeneratedMark | undefined {
  if (!text.startsWith(PREFIX)) return undefined;
  const match = MARK.exec(text);
  if (!match) return { status: "malformed" };
  const [mark, source = "", sha256] = match;
  const status = sha(text.slice(mark.length)) === sha256 ? "intact" : "edited";
  return { status, source };
}

export function generatedPage(source: string, body: string): string {
  if (!/^\S+$/.test(source) || source.includes("-->")) {
    throw new Error(`source must be one word with no "-->": ${JSON.stringify(source)}`);
  }
  return `${PREFIX} source=${source} sha256=${sha(body)} -->\n${body}`;
}

export function writeGeneratedPage(path: string, source: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, generatedPage(source, body));
}

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
