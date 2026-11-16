#!/usr/bin/env node
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { buildSite } from "./build.ts";
import { formatFinding, hasErrors, lint } from "./lint/index.ts";
import { DEFAULT_PORT, startDev } from "./server/dev.ts";
import { ConfigError } from "./site/config.ts";
import { loadSite } from "./site/load.ts";
import type { Finding } from "./site/types.ts";

const USAGE = `Usage:
  docs dev [--root .] [--port N]
  docs build [--root .] [--out dist-site] [--base /]
  docs lint [--root .]`;

async function main(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string", default: "." },
      port: { type: "string" },
      out: { type: "string", default: "dist-site" },
      base: { type: "string", default: "/" },
      help: { type: "boolean", short: "h" },
    },
  });
  const root = resolve(values.root);
  switch (values.help ? "help" : positionals[0]) {
    case "lint": {
      const findings = lint(loadSite(root));
      report(findings);
      return hasErrors(findings) ? 1 : 0;
    }
    case "build": {
      const out = resolve(values.out);
      const result = await buildSite({ root, out, base: values.base });
      report(result.findings);
      if (hasErrors(result.findings)) {
        console.log(`docs: build stopped; ${out} is not changed`);
        return 1;
      }
      console.log(`docs: wrote ${result.pages} pages to ${out}`);
      return 0;
    }
    case "dev": {
      const port = parsePort(values.port ?? process.env.PORT);
      const server = await startDev({ root, port, log: (line) => console.error(line) });
      console.log(`docs: serving ${root} at ${server.url}`);
      return new Promise<number>(() => {});
    }
    default:
      console.log(USAGE);
      return values.help ? 0 : 1;
  }
}

function parsePort(text: string | undefined): number {
  if (text === undefined || text === "") return DEFAULT_PORT;
  const port = Number(text);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ConfigError(`the port must be a number from 1 to 65535, not "${text}"`);
  return port;
}

function report(findings: Finding[]): void {
  for (const finding of findings) console.log(formatFinding(finding));
  const errors = findings.filter((finding) => finding.severity === "error").length;
  if (findings.length > 0) console.log(`docs: ${count(errors, "error")}, ${count(findings.length - errors, "warning")}`);
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof ConfigError ? `docs: ${error.message}` : error);
    process.exit(1);
  },
);
