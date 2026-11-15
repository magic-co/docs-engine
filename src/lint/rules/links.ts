import type { Definition, Image, Link } from "mdast";
import { visit } from "unist-util-visit";
import { resolveLink } from "../../site/links.ts";
import { anchors } from "../../site/markdown.ts";
import type { Page } from "../../site/types.ts";
import type { Rule } from "../types.ts";

export const links: Rule = {
  id: "links",
  severity: "error",
  check(site) {
    const known = new Map<Page, Set<string>>();
    const anchorsOf = (page: Page) => {
      const cached = known.get(page) ?? anchors(page.tree);
      known.set(page, cached);
      return cached;
    };
    return [...site.pages.values()].flatMap((page) => {
      const found: { file: string; line: number; message: string }[] = [];
      visit(page.tree, ["link", "definition", "image"], (node) => {
        const { url, position } = node as Link | Definition | Image;
        const target = resolveLink(site, page, url);
        if (target.kind === "external") return;
        const line = position?.start.line ?? 1;
        if (!target.exists) found.push({ file: page.path, line, message: `\`${url}\`: \`${target.path}\` does not exist` });
        else if (target.anchor && target.page && !anchorsOf(target.page).has(target.anchor)) {
          found.push({ file: page.path, line, message: `\`${url}\`: \`${target.page.path}\` has no heading \`#${target.anchor}\`` });
        }
      });
      return found;
    });
  },
};
