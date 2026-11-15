import type { Finding, Site } from "../site/types.ts";
import { codePaths } from "./rules/code-paths.ts";
import { diagrams } from "./rules/diagrams.ts";
import { figures } from "./rules/figures.ts";
import { generated } from "./rules/generated.ts";
import { glossary } from "./rules/glossary.ts";
import { layout } from "./rules/layout.ts";
import { links } from "./rules/links.ts";
import { routes } from "./rules/routes.ts";
import type { Rule } from "./types.ts";

export const RULES: readonly Rule[] = [layout, routes, links, codePaths, diagrams, figures, generated, glossary];

export function lint(site: Site): Finding[] {
  return RULES.flatMap((rule) => rule.check(site).map((found) => ({ rule: rule.id, severity: rule.severity, ...found }))).sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.rule.localeCompare(b.rule),
  );
}

export function formatFinding(finding: Finding): string {
  const where = finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
  return `${where} ${finding.rule} ${finding.message}`;
}

export function hasErrors(findings: Finding[]): boolean {
  return findings.some((finding) => finding.severity === "error");
}
