# docs-engine

docs-engine turns the Markdown files and `yaml` diagram blocks of a repo into a local docs site. It gives live reload, interactive diagrams and a blocking lint. Each repo keeps only its Markdown, its diagram blocks and an optional `docs.config.json`. One shared engine makes the site.

## Install

The engine needs Node 24 or later. The package is in GitHub Packages. GitHub Packages needs a token for each install, also for a public package. Add this `.npmrc` to the repo:

```ini
@magic-co:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Set `NODE_AUTH_TOKEN` to a GitHub token that can read packages. In GitHub Actions, use `secrets.GITHUB_TOKEN` with the `packages: read` permission. The repo also needs the Read role in "Manage Actions access" of the package settings. Without it, `npm ci` fails with 403. Then install:

```sh
npm install --save-dev @magic-co/docs-engine
```

## Commands

| Command | What it does |
| --- | --- |
| `docs dev [--root .] [--port N]` | Serves the site on 127.0.0.1 and reloads the browser when a page changes. |
| `docs build [--root .] [--out dist-site] [--base /]` | Writes static HTML for each page. Removes the pages that it wrote before for deleted sources, and keeps other files. Stops with exit code 1 when the lint finds an error, and then does not change the output folder. Use `--base` when a host serves the site under a path. For a GitHub Pages project site, use `--base /<repo>/`. |
| `docs lint [--root .]` | Checks the layout, the links, the code paths, the diagrams, the figures and the generated pages. |

`docs dev` uses the `--port` value, then the `PORT` variable, then port 4173. When the port is in use, it uses the next free port. It prints the URL.

`docs lint` prints one line for each finding: `file:line rule message`. It exits with code 1 when one or more findings are errors. Warnings do not change the exit code.

## Layout

Each repo has this layout:

```text
README.md          the home page
GLOSSARY.md        the domain terms
AGENTS.md          rules for agents (not in the site)
docs/adr/          decisions
docs/research/     research (in the site, not in the nav)
docs/agents/       agent notes (not in the site)
docs/<section>/    other sections
```

Read [the layout and the lint rules](docs/guides/layout-and-lint.md) for the full rules. Read [write pages](docs/guides/writing-pages.md) for pages and navigation. Read [the flow diagram](docs/diagrams/flow.md) and [the figure](docs/diagrams/figure.md) for diagrams.

## Configuration

`docs.config.json` at the repo root is optional:

```json
{
  "title": "Roastery docs",
  "theme": "docs/theme.css",
  "lint": { "ignorePaths": ["dist/**"] }
}
```

- `title` is the site title. Without it, the site title is the first heading of `README.md`.
- `theme` is a CSS file that changes the default theme. Read [theme a site](docs/guides/theme.md).
- `lint.ignorePaths` holds globs. The `code-paths` rule does not check a code span that matches one of them.
- `lint.ignorePages` holds globs of page paths. The `code-paths` rule does not check the pages that match one of them.

## Work on the engine

```sh
npm ci
npm run dev        # serve the docs of this repo
npm test
npm run typecheck
npm run build      # compile to dist/
```

`npm run dev` runs the engine from `src/` with Node type stripping. This repo follows its own layout, so its docs are the demo.

## Releases

To release, change `version` in `package.json` in a pull request. When the pull request merges, the `release` workflow publishes that version to GitHub Packages and pushes the tag `v<version>`. When the registry already has the version, the workflow publishes nothing.

The workflow uses the `GITHUB_TOKEN` of the run, so the repo holds no npm token.

## License

MIT. See `LICENSE` and `THIRD_PARTY_NOTICES.md`.
