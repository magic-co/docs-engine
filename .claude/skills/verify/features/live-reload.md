# Live reload

`docs dev` watches the Markdown files, `docs.config.json` and the schema files. After a change, each open page reloads by itself. When a diagram block has an error, the page shows the error in place of the diagram.

## Sub-features

- `reload-page` reloads an open page after a change to a Markdown file, and shows the new text.
- `reload-new-page` serves a new Markdown file at its route and adds it to the nav.
- `reload-config` uses a new `title` from `docs.config.json`.
- `reload-diagram-error` shows "This flow diagram has errors:" with a list of the errors and the source of the block.
- `reload-recover` shows the diagram again after the error is fixed.

## How to get to it (user POV)

- Keep a page of `docs dev` open in the browser.
- Edit and save a Markdown file of the repo.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- The site copy is in the baseline state.
- All steps of one journey run in one `browse` call, so the page stays open while the `run` step changes a file.

- **Mark the page.** Open a page and set a mark that a reload removes. Steps `{"goto": "/guides/"}` and `{"eval": "window.__verifyMarker = 1"}`.
- **Edit the page.** Append a line to the page in the site copy. Step `{"run": "printf '\\nThe roaster tastes each batch.\\n' >> \"$DOCS_VERIFY_SITE/docs/guides/README.md\""}`.
- **See the reload.** Steps `{"expectVisible": {"text": "The roaster tastes each batch."}, "timeout": 10000}` and `{"expectEval": "window.__verifyMarker === undefined"}`. The new text shows without a `goto`, and the mark is gone, so the browser reloaded the page.
- **New page.** Step `{"run": "printf '# Grind the beans\\n' > \"$DOCS_VERIFY_SITE/docs/guides/grinding.md\""}`, then `{"expectVisible": {"role": "link", "name": "Grind the beans"}, "timeout": 10000}`. Then `{"click": {"role": "link", "name": "Grind the beans"}}` and `{"expectUrl": "/guides/grinding/$"}`.
- **Diagram error.** Open the flow page and break an edge. Steps `{"goto": "/diagrams/flow/"}`, `{"run": "sed -i.bak 's/from: pack, to: ship }/from: pack, to: nowhere }/' \"$DOCS_VERIFY_SITE/docs/diagrams/flow.md\" && rm \"$DOCS_VERIFY_SITE/docs/diagrams/flow.md.bak\""}` and `{"expectVisible": {"text": "line 9: edge 7 goes to `nowhere`, which is not a node or a group"}, "timeout": 10000}`. The page shows "This flow diagram has errors:".
- **Recover.** Steps `{"run": "sed -i.bak 's/to: nowhere }/to: ship }/' \"$DOCS_VERIFY_SITE/docs/diagrams/flow.md\" && rm \"$DOCS_VERIFY_SITE/docs/diagrams/flow.md.bak\""}` and `{"expectVisible": {"role": "group", "name": "Order flow"}, "timeout": 10000}`.
- **Proof.** Add `{"aria": "reload-error"}` and `{"screenshot": "reload-error"}` after the error step. The artifacts show the error list in the page.

## Gotchas

- Use `sed -i.bak` and remove the `.bak` file. It works with GNU sed and macOS sed. A `.md.bak` file left in the copy is not a page, but it is clutter.
- A new capitalized word in an edit can add a `glossary` warning to a later lint. Use lowercase words in reload fixtures.
- Restore each change before the next recipe, or run `stop` and `start`. A later recipe expects the baseline.
- The reload is a full page reload, not a hot update. Browser state such as the scroll position and the focus is lost.
- When a change makes the site fail to load, such as a broken `docs.config.json`, the server keeps the last good site and writes the error to `dev.err`. Read it at `$DOCS_VERIFY_RUN/instance/dev.err`.
