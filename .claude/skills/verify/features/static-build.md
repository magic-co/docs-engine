# Build the static site

`docs build` lints the repo, then writes one `index.html` for each page, a `404.html` and the client assets to `dist-site/`. It bundles the client in a scratch folder first, then writes. It stops with exit code 1 and does not change the output folder when the lint or the bundle fails. A good build removes the pages that it wrote before for docs that no longer exist.

## Sub-features

- `build-pages` writes `dist-site/<route>/index.html` for each page and `dist-site/index.html` for the home page.
- `build-404` writes `dist-site/404.html`.
- `build-assets` writes `dist-site/assets/client.js` and `dist-site/assets/client.css`.
- `build-stop` exits 1, prints the findings and `docs: build stopped; <out> is not changed`, and does not touch the output folder when the lint has an error.
- `build-assets-keep` keeps other files in `assets/`. The build replaces only `client.js` and `client.css`.
- `build-prune` removes the pages of deleted docs on the next good build, and keeps files that it did not write.
- `build-out` writes to the folder of `--out`.
- `build-client` gives the static site the same interactive flow diagram as `docs dev`.
- `build-base` with `--base /<path>/` starts each site URL (nav, links, flow links, assets, 404 home link) with that path. A base that does not start and end with `/` stops the build with exit code 1.

## How to get to it (user POV)

- Run `docs build` in a repo, or `docs build --root <dir> --out <dir>`.
- Serve `dist-site/` with any static file server.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- The site copy is in the baseline state, with no `dist-site/`.

- **Build.** Run `control-docs cli build-clean build`. The exit code is 0. stdout ends with `docs: wrote <n> pages to <copy>/dist-site`, where `<n>` is the number of routes. On the baseline it is 9.
- **Files.** Run `find "$DOCS_VERIFY_RUN/instance/site/dist-site" -type f | sort`. The list has `index.html`, `404.html`, `assets/client.js`, `assets/client.css`, `glossary/index.html`, `diagrams/flow/index.html`, `diagrams/figure/index.html` and `research/index.html`. It also has `.docs-engine-manifest.json`, the list of the files that the build wrote: the pages, `404.html`, `assets/client.js` and `assets/client.css`. It has no `agents/` folder.
- **Other out folder.** Run `control-docs cli build-out build --out out-site`. The pages are in `$DOCS_VERIFY_RUN/instance/site/out-site/`.
- **Other assets stay.** Run `printf 'x\n' > "$DOCS_VERIFY_RUN/instance/site/out-site/assets/logo.txt"`, then `control-docs cli build-assets build --out out-site`. The exit code is 0, and `out-site/assets/logo.txt` is still there with `client.js` and `client.css`.
- **Client.** Run the static server and pass its URL into the steps with the shell, because `browse` reads literal JSON: `SU=$(control-docs static); printf '[{"goto": "%s/diagrams/flow/"}, {"hover": {"node": "Roast batch"}}, {"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "The beans are weighed."}}]' "$SU" | control-docs browse build-client -`. The card opens as in `docs dev`.
- **Stop on error.** Run `printf '# Loose\n' > "$DOCS_VERIFY_RUN/instance/site/docs/loose.md"`, `rm -rf "$DOCS_VERIFY_RUN/instance/site/dist-site"` and `control-docs cli build-error build`. The exit code is 1. stdout has the `layout` finding, `docs: 1 error, <n> warnings` and `docs: build stopped; <copy>/dist-site is not changed`. `dist-site/` does not exist. Remove `docs/loose.md`.
- **Old output stays after a failed build.** Run `control-docs cli build-good build --out out-site`. Add the loose page again and run `control-docs cli build-stale build --out out-site`. The exit code is 1, stdout says `out-site is not changed`, and the pages of the good build are still in `out-site/`. Remove `docs/loose.md`.
- **Prune deleted pages.** Run `printf 'keep\n' > "$DOCS_VERIFY_RUN/instance/site/out-site/notes.txt"` and `rm "$DOCS_VERIFY_RUN/instance/site/docs/adr/0001-custom-engine.md"`. Then run `control-docs cli build-prune build --out out-site`. The exit code is 0 and stdout says `wrote 8 pages`. `out-site/adr/custom-engine/index.html` is gone. `out-site/notes.txt` is still there.
- **Base path.** Run `control-docs cli build-base build --out serve/roastery --base /roastery/`. The exit code is 0. Serve `serve/` with a static server, so that `serve/roastery/index.html` is at `/roastery/`. Open `/roastery/`, follow each nav link, follow a page link, click a flow node that has a link, and open `/roastery/404.html` and follow its home link. Each page loads with its styles, each local `href` and `src` starts with `/roastery/`, and no request fails. Then run `control-docs cli build-base-bad build --out bad-site --base roastery`. The exit code is 1, stderr says `the base path must start and end with "/"`, and `bad-site/` does not exist.
- **Proof.** The CLI evidence of each label, the `find` list, and `steps.log` with a screenshot of the static flow page.

## Gotchas

- The Python `http.server` of `control-docs static` does not serve `404.html` for a missing route. A 404 status with a plain error page is the server, not the engine. Check `404.html` as a file.
- The page links and the assets use absolute paths such as `/assets/client.js`. Serve `dist-site/` at the root of a server. A `file://` URL does not work.
- `--out` is relative to the working directory. The helper runs in the site copy, so the output stays in the copy.
- A lint or client-bundle failure leaves the output folder unchanged, by design. An I/O error during output writes can leave partial output. Remove the folder before a "no pages" check, or you see the pages of an earlier build.
- The build removes only the files in its manifest. Other files in the output folder stay, also in `assets/`. Do not delete `.docs-engine-manifest.json` before a prune check.
- `rm` in the site copy is safe. It is a disposable copy, and `stop` removes it.
