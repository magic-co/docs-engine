import type { Rule } from "../types.ts";

export const generated: Rule = {
  id: "generated",
  severity: "error",
  check(site) {
    return [...site.pages.values()].flatMap((page) => {
      switch (page.generated?.status) {
        case "edited":
          return [{ file: page.path, line: 1, message: `the page was edited by hand: its sha256 does not match. Run \`${page.generated.source}\` again` }];
        case "malformed":
          return [{ file: page.path, line: 1, message: "the generated mark must be `<!-- docs-engine:generated source=<source> sha256=<hex> -->`" }];
        default:
          return [];
      }
    });
  },
};
