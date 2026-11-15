import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

const ajv = new Ajv2020({ allErrors: true, strict: true });

export interface Validator {
  (data: unknown): string[];
}

export function compileSchema(schema: object): Validator {
  const validate = ajv.compile(schema);
  return (data) => (validate(data) ? [] : (validate.errors ?? []).map(describe));
}

function describe(error: ErrorObject): string {
  const where = error.instancePath === "" ? "the block" : `\`${error.instancePath.slice(1).replaceAll("/", ".")}\``;
  const allowed = error.keyword === "enum" ? `: ${(error.params as { allowedValues: unknown[] }).allowedValues.join(", ")}` : "";
  const extra = error.keyword === "additionalProperties" ? ` (\`${(error.params as { additionalProperty: string }).additionalProperty}\`)` : "";
  return `${where} ${error.message ?? "is not valid"}${allowed}${extra}`;
}
