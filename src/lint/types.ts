import type { Finding, Severity, Site } from "../site/types.ts";

export interface Rule {
  id: string;
  severity: Severity;
  check(site: Site): Omit<Finding, "rule" | "severity">[];
}
