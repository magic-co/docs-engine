# Build the static site

`docs build` lints the repo, then writes one `index.html` for each page, a `404.html` and the client assets to `dist-site/`. It stops with exit code 1 and writes no pages when the lint finds an error.

## Sub-features

- `build-pages` writes `dist-site/<route>/index.html` for each page and `dist-site/index.html` for the home page.
- `build-404` writes `dist-site/404.html`.
- `build-assets` writes `dist-site/assets/client.js` and `dist-site/assets/client.css`.
- `build-stop` exits 1, prints the findings and writes no pages when the lint has an error.
- `build-out` writes to the folder of `--out`.
- `build-client` gives the static site the same interactive flow diagram as `docs dev`.

## How to get to it (user POV)

- Run `docs build` in a repo, or `docs build --root <dir> --out <dir>`.
- Serve `dist-site/` with any static file server.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- The site copy is in the baseline state, with no `dist-site/`.

- **Build.** Run `control-docs cli build-clean build`. The exit code is 0. stdout ends with `docs: wrote <n> pages to <copy>/dist-site`, where `<n>` is the number of routes. On the baseline it is 8.
- **Files.** Run `find "$DOCS_VERIFY_RUN/instance/site/dist-site" -type f | sort`. The list has `index.html`, `404.html`, `assets/client.js`, `assets/client.css`, `glossary/index.html`, `diagrams/flow/index.html` and `research/index.html`. It has no `agents/` folder.
- **Other out folder.** Run `control-docs cli build-out build --out out-site`. The pages are in `$DOCS_VERIFY_RUN/instance/site/out-site/`.
- **Client.** Run `control-docs static` and keep its URL as `$SU`. Run `browse` with `{"goto": "$SU/diagrams/flow/"}`, `{"hover": {"node": "Roast batch"}}` and `{"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "The beans are weighed."}}`. The card opens as in `docs dev`.
- **Stop on error.** Run `printf '# Loose\n' > "$DOCS_VERIFY_RUN/instance/site/docs/loose.md"`, `rm -rf "$DOCS_VERIFY_RUN/instance/site/dist-site"` and `control-docs cli build-error build`. The exit code is 1. stdout has the `layout` finding and no `docs: wrote` line. `dist-site/` does not exist.
- **Proof.** The CLI evidence of each label, the `find` list, and `steps.log` with a screenshot of the static flow page.

## Gotchas

- `python3 -m http.server` does not serve `404.html` for a missing route. A 404 status with a plain error page is the server, not the engine. Check `404.html` as a file.
- The page links and the assets use absolute paths such as `/assets/client.js`. Serve `dist-site/` at the root of a server. A `file://` URL does not work.
- `--out` is relative to the working directory. The helper runs in the site copy, so the output stays in the copy.
- `rm` in the site copy is safe. It is a disposable copy, and `stop` removes it.
