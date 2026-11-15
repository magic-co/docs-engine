import { decodeNamedCharacterReference } from "decode-named-character-reference";

function codePoint(value: number): string {
  return value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff) ? "\uFFFD" : String.fromCodePoint(value);
}

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]*);/gi, (whole, name: string) => {
    if (/^#x/i.test(name)) return codePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return codePoint(Number(name.slice(1)));
    return decodeNamedCharacterReference(name) || whole;
  });
}

// The words that a reader sees or hears: the text, plus the aria-label, title and alt values.
export function figureText(html: string): string {
  const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ");
  const labels = [...body.matchAll(/\s(?:aria-label|title|alt)\s*=\s*("([^"]*)"|'([^']*)')/gi)].map((match) => match[2] ?? match[3] ?? "");
  const text = body.replace(/<[^>]*>/g, " ");
  return normalize(decode([text, ...labels].join(" ")));
}

export function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
