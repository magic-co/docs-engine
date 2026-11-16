import { parseDocument } from "yaml";
import { compileSchema, type Validator } from "../schema.ts";
import { repoFile } from "../site/files.ts";
import type { DiagramBlock, RepoPath } from "../site/types.ts";
import { ModuleError, runModule } from "./module.ts";
import { figure } from "./figure/index.ts";
import { flow } from "./flow/index.ts";
import { gantt } from "./gantt/index.ts";
import { tree } from "./tree/index.ts";
import type { DiagramType } from "./types.ts";

export const DIAGRAM_TYPES: Record<string, DiagramType<never>> = { flow, tree, gantt, figure };

export interface Problem {
  line: number;
  message: string;
}

/** Where a block is, so that a `from` path can resolve. */
export interface BlockPlace {
  root: string;
  page: RepoPath;
}

export type Checked = { ok: true; type: DiagramType<unknown>; data: unknown } | { ok: false; problems: Problem[] };

const validators = new Map<DiagramType<never>, Validator>();

export function checkDiagram(block: DiagramBlock, place: BlockPlace): Checked {
  const fail = (messages: string[], line = block.line): Checked => ({
    ok: false,
    problems: messages.map((message) => ({ line, message })),
  });
  const type = Object.hasOwn(DIAGRAM_TYPES, block.type) ? DIAGRAM_TYPES[block.type] : undefined;
  if (!type) return fail([`unknown diagram type \`${block.type}\` (known: ${Object.keys(DIAGRAM_TYPES).join(", ")})`]);
  const document = parseDocument(block.source);
  if (document.errors.length > 0) {
    return {
      ok: false,
      problems: document.errors.map((error) => ({
        line: block.line + (error.linePos?.[0].line ?? 1),
        message: `YAML: ${error.message.split("\n")[0]}`,
      })),
    };
  }
  let data: unknown;
  try {
    data = document.toJS();
  } catch (error) {
    return fail([`YAML: ${error instanceof Error ? error.message : String(error)}`]);
  }
  const from = isFrom(data) ? data.from : undefined;
  if (from !== undefined) {
    const file = repoFile(place.root, place.page, from);
    if (!file) return fail([`the module \`${from}\` in \`from\` does not exist in the repo`]);
    try {
      data = runModule(file, place.root);
    } catch (error) {
      if (error instanceof ModuleError) return fail([error.message]);
      throw error;
    }
  }
  let validate = validators.get(type);
  if (!validate) {
    validate = compileSchema(type.schema);
    validators.set(type, validate);
  }
  const shape = validate(data);
  if (shape.length > 0) return fail(from !== undefined ? shape.map((message) => `the default export of the module: ${message}`) : shape);
  const typed = type as DiagramType<unknown>;
  const refs = typed.check(data);
  return refs.length > 0 ? fail(refs) : { ok: true, type: typed, data };
}

// A block that holds only `from: <module>` gets its data from the default export of that module.
function isFrom(data: unknown): data is { from: string } {
  return typeof data === "object" && data !== null && Object.keys(data).length === 1 && typeof (data as { from?: unknown }).from === "string";
}
