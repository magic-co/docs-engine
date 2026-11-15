import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compileSchema } from "../schema.ts";

export interface Config {
  title?: string;
  lint: { ignorePaths: string[] };
}

export const CONFIG_FILE = "docs.config.json";

const validate = compileSchema({
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: { type: "string" },
    title: { type: "string", minLength: 1 },
    lint: {
      type: "object",
      additionalProperties: false,
      properties: { ignorePaths: { type: "array", items: { type: "string" } } },
    },
  },
});

export class ConfigError extends Error {}

export function readConfig(root: string): Config {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return { lint: { ignorePaths: [] } };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new ConfigError(`${CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const problems = validate(raw);
  if (problems.length > 0) throw new ConfigError(`${CONFIG_FILE}: ${problems.join("; ")}`);
  const parsed = raw as { title?: string; lint?: { ignorePaths?: string[] } };
  return { title: parsed.title, lint: { ignorePaths: parsed.lint?.ignorePaths ?? [] } };
}
