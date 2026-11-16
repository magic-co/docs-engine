# Tree diagram

A `yaml tree` block becomes an interactive hierarchy. The engine places each node under its parent. The nodes work like flow nodes: a card on hover or keyboard focus, arrow keys, and a click to the row of the node. A block with `from` gets its data from a module of the repo.

## Sub-features

- `tree-render` draws one link for each node in a group named after the title. A node with a `note` shows it on a second line.
- `tree-hover-card` opens a card with `<relation> <parent>`, the label and the details.
- `tree-click-row` goes to `#<diagram id>-<node id>`.
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
- **Data from a module.** In the site copy, change `Bo` to `Bea` in `docs/diagrams/data/team.yaml`. Step `{"goto": "/diagrams/tree/"}`, then `{"expectVisible": {"role": "link", "name": "Head Roaster Bea"}}`. Restore the file after.
- **Proof.** After the hover step, run `{"screenshot": "tree-hover"}` and `{"aria": "tree-hover"}`.

## Gotchas

- The accessible name of a node is its label and its note, such as `Head Roaster Bo`. The `{"node": ...}` target matches only the label text, so use a role target.
- The site copy links `node_modules` from the checkout, because `data/team.mjs` imports `yaml`. Without the link the tree shows an error in its place.
