# Tree diagram

A `yaml tree` block becomes an interactive hierarchy. The engine places each node under its parent. The nodes work like flow nodes: a card on hover or keyboard focus, arrow keys, and a click to the row of the node. A block with `from` gets its data from a module of the repo.

## Sub-features

- `tree-render` draws one link for each node in a group named after the title. A node with a `note` shows it on a second line.
- `tree-hover-card` opens a card with `<relation> <parent>`, the label and the details.
- `tree-click-row` goes to `#<diagram id>-<node id>`. Only a node with a `description` or `details` has a row. A node with neither has no link target.
- `tree-from` draws the data of the module `data/team.mjs`, which reads `data/team.yaml`.

## How to get to it (user POV)

- Open `/diagrams/tree/`, "The tree diagram", in the Diagrams section.
- Move the pointer over a node, or Tab to it.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- `docs/diagrams/tree.md` in the site copy has the baseline "Roastery team" example, with `from: data/team.mjs`.

- **Render.** Steps `{"goto": "/diagrams/tree/"}` and `{"expectCount": {"target": {"css": "docs-flow-node a"}, "count": 5}}`. The snapshot has `group "Roastery team"` with the links `Owner Ada`, `Head Roaster Bo`, `Shop Lead Cy`, `Roast Helper Di` and `Barista Ed and Flo`.
- **Hover card.** Steps `{"hover": {"role": "link", "name": "Head Roaster Bo"}}` and `{"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "Reports to Owner"}}`. The card lists `Roast each batch` and `Cup each batch` under `Tasks`.
- **Click to a row.** Steps `{"click": {"role": "link", "name": "Head Roaster Bo"}}` and `{"expectUrl": "#roastery-team-head-roaster$"}`.
- **Data from a module.** With the page open, change `Bo` to `Bea` in the YAML file. Steps `{"run": "sed -i 's/name: Bo,/name: Bea,/' \"$DOCS_VERIFY_SITE/docs/diagrams/data/team.yaml\""}` and `{"expectVisible": {"role": "link", "name": "Head Roaster Bea"}, "timeout": 10000}`. Live reload shows the change. Run `control-docs restore docs/diagrams/data/team.yaml` after.
- **Proof.** After the hover step, run `{"screenshot": "tree-hover"}` and `{"aria": "tree-hover"}`.

## Gotchas

- Do not `goto` the page right after a file change. Live reload aborts that navigation. Wait for the new text instead.

- The accessible name of a node is its label and its note, such as `Head Roaster Bo`. The `{"node": ...}` target matches only the label text, so use a role target.
- The site copy links `node_modules` from the checkout, because `data/team.mjs` imports `yaml`. Without the link the tree shows an error in its place.
