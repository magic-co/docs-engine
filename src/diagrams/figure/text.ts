const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
    return ENTITIES[name.toLowerCase()] ?? whole;
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
