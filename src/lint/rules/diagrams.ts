import { checkDiagram } from "../../diagrams/index.ts";
import type { Rule } from "../types.ts";

export const diagrams: Rule = {
  id: "diagrams",
  severity: "error",
  check(site) {
    return [...site.pages.values()].flatMap((page) =>
      page.diagrams.flatMap((block) => {
        const checked = checkDiagram(block);
        return checked.ok ? [] : checked.problems.map((problem) => ({ file: page.path, ...problem }));
      }),
    );
  },
};
