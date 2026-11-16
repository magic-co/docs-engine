import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize } from "node:path";
import { compileSchema } from "../schema.ts";

export interface Config {
  title?: string;
  /** A CSS file of the repo that the site loads after the default theme, relative to the repo root. */
  theme?: string;
  lint: { ignorePaths: string[]; ignorePages: string[] };
}

export const CONFIG_FILE = "docs.config.json";

const validate = compileSchema({
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: { type: "string" },
    title: { type: "string", minLength: 1 },
    theme: { type: "string", pattern: "\\.css$" },
    lint: {
      type: "object",
      additionalProperties: false,
      properties: {
        ignorePaths: { type: "array", items: { type: "string" } },
        ignorePages: { type: "array", items: { type: "string" } },
      },
    },
  },
});

export class ConfigError extends Error {}

export function readConfig(root: string): Config {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return { lint: { ignorePaths: [], ignorePages: [] } };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new ConfigError(`${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const problems = validate(raw);
  if (problems.length > 0) throw new ConfigError(`${CONFIG_FILE}: ${problems.join("; ")}`);
  const parsed = raw as { title?: string; theme?: string; lint?: { ignorePaths?: string[]; ignorePages?: string[] } };
  if (parsed.theme !== undefined) checkTheme(root, parsed.theme);
  return { title: parsed.title, theme: parsed.theme, lint: { ignorePaths: parsed.lint?.ignorePaths ?? [], ignorePages: parsed.lint?.ignorePages ?? [] } };
}

function checkTheme(root: string, theme: string): void {
  const path = normalize(theme);
  if (isAbsolute(path) || path.startsWith("..")) throw new ConfigError(`${CONFIG_FILE}: the theme must be a path inside the repo, not "${theme}"`);
  if (!existsSync(join(root, path))) throw new ConfigError(`${CONFIG_FILE}: the theme file "${theme}" does not exist`);
}
