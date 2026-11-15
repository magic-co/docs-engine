# The layout and the lint rules

## Layout

One table in `src/site/layout.ts` holds the fixed layout. The lint, the nav and the routes all read it.

| Path | Area | In the site | In the nav |
| --- | --- | --- | --- |
| `README.md` | home | yes, at `/` | yes |
| `GLOSSARY.md` | glossary | yes, at `/glossary/` | yes |
| `AGENTS.md` | agents | no | no |
| `docs/adr/` | adr | yes | yes, as the Decisions section |
| `docs/research/` | research | yes | no, the footer links to it |
| `docs/agents/` | agents | no | no |
| any other `docs/<section>/` | docs | yes | yes |

The engine reads "nothing else at the top of `docs/`" like this: each page is in a section folder. A Markdown file directly in `docs/` is an error. Other section folders are free.

## Rules

`docs lint` runs these rules. An error stops `docs build` and makes `docs lint` exit with code 1. A warning only prints.

| Rule | Severity | What it checks |
| --- | --- | --- |
| `layout` | error | `README.md`, `GLOSSARY.md` and `AGENTS.md` exist. `docs/adr/`, `docs/research/` and `docs/agents/` exist. No page is directly in `docs/`. |
| `routes` | error | Each page has its own route. No folder or file name gives an empty, `.` or `..` route segment. No route starts with `/assets/`, because the build writes the client files there. No route has the segment `index.html` or starts with `/404.html/`, because the build writes those files. |
| `links` | error | Each relative link goes to a file that exists. Each link to a heading goes to a heading that exists. The rule does not check `http:`, `https:` or `mailto:` links. |
| `code-paths` | error | Each inline code span that looks like a repo path exists. |
| `diagrams` | error | Each diagram block parses, has a known type, passes the schema of its type and passes the check of its type. |
| `generated` | error | Each generated page has a correct mark and a hash that matches. |
| `glossary` | warning | A capitalized term that shows in two or more places is in `GLOSSARY.md`. |

### code-paths

An inline code span looks like a path when all of these are true:

- It has a slash, or it ends in a known file extension such as `.md` or `.json`.
- It has no spaces.
- It is not a URL.
- It does not start with `@` or `-`.
- It does not have `<`, `*`, `{` or `(`.

The path can be relative to the repo root or to the page. It must stay inside the repo. To skip some paths, add globs to `lint.ignorePaths` in `docs.config.json`. A glob matches the path without a `:line` suffix.

### generated

A generated page starts with this line:

```text
<!-- docs-engine:generated source=<source> sha256=<hex> -->
```

The hash covers all of the file after that line. Use `writeGeneratedPage(path, source, body)` from the package to write a generated page. Do not edit a generated page by hand. Change its source and write it again.

### glossary

The rule finds capitalized words in the middle of a sentence. It does not look in headings, links or code. A term is defined when it is a `##` heading or a bold term in `GLOSSARY.md`. The rule only warns, because a name such as a product name can look like a term.
