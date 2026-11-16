# docs-engine verification map

This directory is the maintained source to verify the user-facing behavior of docs-engine. Read this index before you drive the engine. Then use the feature file as the recipe.

## Baseline preconditions

- Run `control-docs start` from the repo root and export its `DOCS_VERIFY_RUN` line.
- The site is a disposable copy of this repo at `$DOCS_VERIFY_RUN/instance/site`. Its docs are the demo: the home page, the glossary, the Decisions, Diagrams and Guides sections, and the Research pages.
- The baseline lint has 0 errors and some `glossary` warnings.
- `control-docs doctor` ends with `doctor: healthy`.
- Never drive an instance that this run did not start.

## Driving conventions

- Start each recipe from the baseline state, unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors.
- Treat each command, label and file name as literal.
- Run browser actions with `control-docs browse <label> <steps>`.
- Run terminal actions with `control-docs cli <label> <docs arguments>`.
- Change files only in the site copy. After the recipe, run `control-docs restore <path>...` for each changed or new path, or run `stop` and `start` again. `restore` copies the path back from the baseline that `start` saved, so uncommitted changes in the checkout stay. Do not restore with `git show HEAD`.
- Keep the proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the result, not only the final screen.
- A browser proof has `steps.log` and an ARIA snapshot or a screenshot.
- A CLI proof has the command, stdout, stderr and the exit code.
- Record the feature ID and the entry point in the evidence label.
- Report a path that you cannot reach with the command that you tried and the precondition that failed.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph about the user-visible behavior. Then it has four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with control-docs` and `Gotchas`. `Driving it with control-docs` starts with `Preconditions:`. Then each bullet pairs a user action with an exact step or command and the result that you can see. Keep the internals of the engine out of the map.

## Features

- [Browse the site](./browse-site.md) covers the home page, the nav, the routes, the slash redirect, the pages that are not in the site and the 404 page.
- [Flow diagram](./flow-diagram.md) covers the hover card, the keyboard focus and arrow keys, and the links of a node to its table row or its `href`.
- [Tree diagram](./tree-diagram.md) covers a `yaml tree` block, its cards and rows, and the data of a `from` module.
- [Gantt chart](./gantt-diagram.md) covers a `yaml gantt` block, its axis labels, its cards and its links.
- [Figure](./figure.md) covers a `yaml figure` block: the drawing and the script of its module, and the error in place of a figure whose module fails.
- [Live reload](./live-reload.md) covers the reload of an open page after an edit, and a diagram error in the page.
- [Lint the docs](./lint.md) covers the findings of each rule, the line format, the exit codes, the figure source check and the code-path options.
- [Build the static site](./static-build.md) covers the files that `docs build` writes, the stop on a lint error and the flow diagram in the static site.
