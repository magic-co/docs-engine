# Lint the docs

`docs lint` checks the layout, the links, the code paths, the diagrams, the generated pages and the glossary terms of a repo. It prints one line for each finding and a total. It exits with code 1 when there is one or more errors. Warnings do not change the exit code.

## Sub-features

- `lint-clean` exits 0 on a repo with no errors and prints the warnings.
- `lint-routes` finds two pages with the same route, a name that gives an empty, `.` or `..` route segment, and a route under `/assets/`.
- `lint-layout` finds a page directly in `docs/`, and a missing `README.md`, `GLOSSARY.md`, `AGENTS.md`, `docs/adr/`, `docs/research/` or `docs/agents/`.
- `lint-links` finds a link to a missing file and a link to a missing heading.
- `lint-code-paths` finds an inline code span that looks like a path and does not exist.
- `lint-diagrams` finds a diagram block that fails its schema or its checks.
- `lint-generated` finds a generated page with a bad mark or a hash that does not match.
- `lint-glossary` warns about a capitalized term in two or more places that `GLOSSARY.md` does not define.
- `lint-exit` exits 1 on one or more errors and 0 on warnings only.

## How to get to it (user POV)

- Run `docs lint` in a repo, or `docs lint --root <dir>`.
- In this repo, run `npm run lint:docs`.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`. The lint does not need the dev server, but the helper needs a run.
- The site copy is in the baseline state.

- **Clean.** Run `control-docs cli lint-clean lint`. The exit code is 0. stdout has only `glossary` lines and ends with `docs: 0 errors, <n> warnings`.
- **Break five rules.** In the site copy, run `printf '# Loose\n' > "$DOCS_VERIFY_RUN/instance/site/docs/loose.md"`, `printf '\nSee [the kiln](missing.md) and [a head](README.md#no-such-heading). Use `src/missing.ts`.\n' >> "$DOCS_VERIFY_RUN/instance/site/docs/guides/README.md"` and `printf '<!-- docs-engine:generated source=roast-log sha256=%s -->\n# Log\n' "$(printf '0%.0s' $(seq 64))" > "$DOCS_VERIFY_RUN/instance/site/docs/guides/log.md"`.
- **See the errors.** Run `control-docs cli lint-errors lint`. The exit code is 1. stdout has these lines, in the format `file:line rule message`:
  - `docs/loose.md layout a page directly in `docs/` is not allowed: move it into a section folder`
  - `docs/guides/README.md:<line> links `missing.md`: `docs/guides/missing.md` does not exist`
  - `docs/guides/README.md:<line> links `README.md#no-such-heading`: `docs/guides/README.md` has no heading `#no-such-heading``
  - `docs/guides/README.md:<line> code-paths `src/missing.ts` does not exist in the repo`
  - `docs/guides/log.md:1 generated the page was edited by hand: its sha256 does not match. Run `roast-log` again`
  - The last line is `docs: 5 errors, <n> warnings`.
- **Restore.** Run `control-docs restore docs/loose.md docs/guides/log.md docs/guides/README.md`. Run `control-docs cli lint-restored lint`. The exit code is 0. The later steps each start from this baseline.
- **Routes.** Run `mkdir -p "$DOCS_VERIFY_RUN/instance/site/docs/assets"`, `printf '# Logo\n' > "$DOCS_VERIFY_RUN/instance/site/docs/assets/logo.md"` and `printf '# Guides again\n' > "$DOCS_VERIFY_RUN/instance/site/docs/guides/index.md"`. Then run `control-docs cli lint-routes lint`. The exit code is 1. stdout has a `routes` line for `docs/assets/logo.md` and a `routes` line that says that `/guides/` is also the route of another page. Run `control-docs restore docs/assets docs/guides/index.md`.
- **Missing top-level file.** Run `mv "$DOCS_VERIFY_RUN/instance/site/GLOSSARY.md" "$DOCS_VERIFY_RUN/instance/site/GLOSSARY.md.off"`, then `control-docs cli lint-layout-missing lint`. The exit code is 1. stdout has `GLOSSARY.md layout the file `GLOSSARY.md` must exist`. Move the file back.
- **New glossary warning.** Run `printf '\nEach batch goes to the Kiln room.\n\nThe beans rest in the Kiln room.\n' >> "$DOCS_VERIFY_RUN/instance/site/docs/guides/writing-pages.md"`, then `control-docs cli lint-glossary lint`. The exit code is 0. stdout has a new line `docs/guides/writing-pages.md:<line> glossary "Kiln" looks like a term (2 places), but GLOSSARY.md does not define it`, and the warning count is one more than the baseline.
- **Diagram error.** Run `sed -i.bak 's/from: pack, to: ship }/from: pack, to: nowhere }/' "$DOCS_VERIFY_RUN/instance/site/docs/diagrams/flow.md"`, then `control-docs cli lint-diagram lint`. stdout has `docs/diagrams/flow.md:9 diagrams edge 7 goes to `nowhere`, which is not a node or a group`. Run `control-docs restore docs/diagrams/flow.md docs/diagrams/flow.md.bak`.
- **Warnings only.** Run `control-docs restore docs/guides/writing-pages.md` to remove the glossary fixture. Run `control-docs cli lint-warnings lint`. The exit code is 0 although stdout has `glossary` warnings.
- **Proof.** The `command.txt`, `stdout.txt`, `stderr.txt` and `exit-code.txt` of each label.

## Gotchas

- The copy must hold every file of the checkout. A copy without `src/` or `.claude/skills/` gives false `code-paths` errors for the paths that the docs name.
- The order of the findings is by file, not by rule. Assert each line, not the order.
- A hash of the wrong length gives a different message: "the generated mark must be ...". Use 64 hex digits to test the hash check.
- A missing top-level file also gives `code-paths` and `links` errors for each mention of it. The `layout` line is the root cause. The other lines are correct.
- The summary line uses the singular for a count of one: `docs: 1 error, 1 warning`.
- The `glossary` rule counts places by file and line. Two mentions on one line are one place. A capitalized word right after the start of a sentence joins the first word, such as "The Kiln", and the rule skips it. Put each mention on its own line, after a lowercase word.
- The `glossary` rule only warns. The baseline has some warnings, so do not expect an empty stdout.
