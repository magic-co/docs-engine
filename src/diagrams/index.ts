import { parseDocument } from "yaml";
import { compileSchema, type Validator } from "../schema.ts";
import type { DiagramBlock } from "../site/types.ts";
import { flow } from "./flow/index.ts";
import type { DiagramType } from "./types.ts";

export const DIAGRAM_TYPES: Record<string, DiagramType<never>> = { flow };

export interface Problem {
  line: number;
  message: string;
}

export type Checked = { ok: true; type: DiagramType<unknown>; data: unknown } | { ok: false; problems: Problem[] };

const validators = new Map<DiagramType<never>, Validator>();

export function checkDiagram(block: DiagramBlock): Checked {
  const fail = (messages: string[], line = block.line): Checked => ({
    ok: false,
    problems: messages.map((message) => ({ line, message })),
  });
  const type = DIAGRAM_TYPES[block.type];
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
  const data: unknown = document.toJS();
  let validate = validators.get(type);
  if (!validate) {
    validate = compileSchema(type.schema);
    validators.set(type, validate);
  }
  const shape = validate(data);
  if (shape.length > 0) return fail(shape);
  const typed = type as DiagramType<unknown>;
  const refs = typed.check(data);
  return refs.length > 0 ? fail(refs) : { ok: true, type: typed, data };
}
