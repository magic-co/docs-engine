---
name: verify
description: "Drive docs-engine the way a user does and capture proof. The surfaces are the `docs` CLI (lint, build) and the local site of `docs dev` (nav, routes, interactive flow, tree and Gantt diagrams, live reload). Use it to prove a change to the engine works in the real app, not only in the unit tests, and for /verify on this repo."
---

# Verify docs-engine

docs-engine is a CLI. `docs dev` serves a local docs site, `docs build` writes a static site and `docs lint` checks the docs of a repo. A user touches two surfaces: the terminal and the site in a browser. This skill drives both against a disposable copy of this repo, because the repo follows its own layout and its docs are the demo.

All work goes through one helper: `.claude/skills/verify/scripts/control-docs`. Run every command from the repo root. Read the [feature map](features/README.md) before you drive a feature.

## Requirements

- Node 24 or later on `PATH`. The engine refuses older versions. In a cloud container with Node 22, look for `/opt/node24/bin` and run `export PATH=/opt/node24/bin:$PATH`.
- Playwright that `require('playwright')` can resolve, with a Chromium browser. Cloud containers have it. On a laptop, run `npm install --no-save playwright` and `npx playwright install chromium` once. Do not add Playwright to `package.json`.
- `git`, `curl`, `tar`, `python3` and `pgrep`. macOS and Linux both have them.

## Launch

```sh
S=.claude/skills/verify/scripts/control-docs
$S start
```

`start` does these steps:

1. Runs `npm ci` when `node_modules/` is missing.
2. Runs `npm run build`, so the run uses `dist/cli.js`, the same file that the `docs` bin runs.
3. Copies each tracked and new file of the checkout to `$TMPDIR/docs-verify/<run-id>/instance/site/`. The copy is the disposable data dir. Drives may change it.
4. Starts `docs dev` in that copy on a random port from 20000 to 39999. Set `DOCS_VERIFY_PORT` to choose the port.
5. Waits for the `docs: serving <root> at <url>` line and for a page with a `<title>`. Then the site is usable.

It prints four lines. Run the `export` line in each shell that drives this instance:

```text
export DOCS_VERIFY_RUN=/tmp/docs-verify/20261115-190850-1665
url=http://127.0.0.1:38976
site=/tmp/docs-verify/20261115-190850-1665/instance/site
evidence=/tmp/docs-verify/20261115-190850-1665/evidence
```

Each run has its own id, copy and port, so two runs can go side by side. A drive never touches the checkout itself or a `docs dev` that a person started.

## Doctor

```sh
$S doctor
```

Run it before the first drive, after each failed drive and when anything looks wrong. It is read-only. It checks the Node version, that the dev server process is alive, that the process runs `dist/cli.js dev` of this checkout, that its working directory is the disposable copy, that `GET /` answers with a title, that `dist/` was built from the current `HEAD`, and that Playwright resolves. It ends with `doctor: healthy` or `doctor: not healthy`. When `HEAD` moved after `start`, run `stop` and `start` again.

## Drive

### Terminal

```sh
$S cli <label> <docs arguments...>
```

The helper runs `node dist/cli.js <arguments>` with the site copy as the working directory, so `--root .` and `--out dist-site` point into the copy. It saves `command.txt`, `stdout.txt`, `stderr.txt` and `exit-code.txt` in `evidence/<label>/`. Examples: `$S cli lint-clean lint`, `$S cli build-clean build`.

### Browser

```sh
$S browse <label> steps.json     # or: ... | $S browse <label> -
```

`browse` runs a JSON list of steps in one Chromium page, in order, and stops at the first failure. Relative URLs go to the dev server. Absolute URLs go where they say. Each step is an object with one key. Add `"timeout": <ms>` to a step to change its 5000 ms wait.

| Step | What it does |
| --- | --- |
| `{"goto": "/diagrams/flow/"}` | Opens a URL and logs the HTTP status. |
| `{"hover": T}`, `{"focus": T}`, `{"click": T}` | Acts on target `T`. |
| `{"press": "ArrowRight"}` | Presses a key on the focused element. |
| `{"expectVisible": T}`, `{"expectHidden": T}` | Waits until `T` is visible or hidden. |
| `{"expectFocused": T}` | Waits until `T` has the focus. |
| `{"expectUrl": "#order-flow-roast$"}` | Waits until the URL matches the regular expression. |
| `{"expectCount": {"target": T, "count": 8}}` | Waits until `T` matches that many elements. |
| `{"eval": "location.hash"}` | Runs JavaScript in the page and logs the result. |
| `{"expectEval": "window.__mark === undefined"}` | Waits until the expression is true. |
| `{"run": "shell command"}` | Runs a shell command while the page stays open. `$DOCS_VERIFY_SITE` is the site copy. |
| `{"wait": 1000}` | Waits. Use it only to prove that nothing happens. |
| `{"viewport": [390, 844]}` | Sets the page size. The page starts at 1280 by 900. |
| `{"aria": "name"}` | Saves the ARIA snapshot of the page as `name.aria.yaml`. |
| `{"screenshot": "name"}` | Saves a full-page `name.png`. |
| `{"text": {"target": T, "save": "name"}}` | Saves the visible text of `T` as `name.txt`. |

A target `T` is one of these, from the most stable to the least stable:

- `{"role": "link", "name": "Roast batch"}`: an ARIA role and its exact accessible name.
- `{"node": "Roast batch"}`: the link of the flow node with that exact label.
- `{"text": "Shipping rules"}` or the string `"Shipping rules"`: exact visible text.
- `{"css": "ui-hover-card-content:not([hidden])"}`: a CSS selector. Use it only for an element with no role, such as the hover card.

Add `"hasText": "..."` to filter a target by its text, and `"nth": 0` to pick one match.

The stable handles of the site:

- The nav is `navigation "Docs"`. The current page link has `aria-current="page"`. Below 800px wide, the `button "Menu"` opens the nav tree `#docs-nav-tree`, and its `aria-expanded` tells the state.
- The page body is `main` > `article`. The footer has the `Research` link when `docs/research/` exists.
- A flow diagram is `figure` > `group "<title>"`. Each node is `docs-flow-node[value=<id>][data-kind=<kind>]` with one `link "<label>"` inside.
- A figure is `div.docs-figure`. Its content comes from the module, so use the roles and the classes that the module writes, such as `img "The order flow as a line of machines"` and `.roast-line-step-name`.
- The open hover card is `ui-hover-card-content:not([hidden])`. It holds the kind, the label, the description, the details and a hint.
- The details table is `table.docs-flow-details`. Each row has the id `<diagram id>-<node id>`, such as `order-flow-roast`.

### Restore the baseline

```sh
$S restore docs/guides/README.md docs/loose.md
```

`start` saves a second copy of the site as the baseline, at `$DOCS_VERIFY_RUN/instance/baseline/`. `restore` copies each path back from it, and removes a path that the baseline does not have. Paths are relative to the site copy. Use it after each fixture change.

### Static site

```sh
$S cli build-clean build
$S static                        # prints the URL of the static server
```

`static` serves `dist-site/` of the copy with a Python `http.server` on 127.0.0.1 and prints its URL. The server binds port 0, so the kernel gives it a free port that no other server shares. Use that URL as an absolute `goto`. `browse` does not expand shell variables in the JSON, so put the URL into the steps with the shell. A second call prints the same URL.

## Evidence

Each `cli` and `browse` call writes to `$DOCS_VERIFY_RUN/evidence/<label>/`. `browse` writes `steps.json`, `steps.log` (one `ok` or `FAIL` line for each step, then the console errors and the result). An uncaught page exception fails the drive, also when each step passed. Console errors only print, because a 404 page logs one and the files of its `aria`, `screenshot` and `text` steps. On a failure it also writes `failure.png` and `failure.aria.yaml`.

Proof standards:

- Drive the real user path. Use the CLI and the browser, not `loadSite` or other internals.
- Capture the action and the result. For a browser feature, save an ARIA snapshot or a screenshot after the action, and keep `steps.log`.
- Check the side effects too: the files that `docs build` writes, the exit code, the reload of an open page.
- For a CLI proof, keep the command, stdout, stderr and the exit code. The helper does this.
- Name the feature ID and the entry point with each label, such as `flow-hover-card` or `lint-exit-error`.
- A change to a file in the site copy is the fixture of that drive. Do not change the checkout to make a journey pass.

## Cleanup

```sh
$S stop
```

`stop` stops only the processes that this run started: the dev server and the static server. It saves the pid and the command line of each at launch, and it signals a pid only while that pid still runs the saved command. It copies the logs of the instance to `evidence/instance-logs/` and then removes `$DOCS_VERIFY_RUN/instance/`. The evidence stays at `$DOCS_VERIFY_RUN/evidence/`. Run `ls "$DOCS_VERIFY_RUN/evidence"` after `stop` to confirm it. Never kill by process name. Run `stop` after each failed attempt too, then `start` again.

## Maintain

Keep this skill and its feature map current with `/maintain-verification-skill`. Run it after a change to a user-facing part of the engine: a CLI command or flag, a route rule, a lint rule or a config option, a diagram type, a figure, the files that `docs dev` watches, or a client component.
