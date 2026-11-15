# Flow diagram

A `yaml flow` block in a page becomes an interactive diagram. Each node shows a card on hover or keyboard focus. The arrow keys move between nodes. A click or Enter goes to the node `href`, or to the row of the node in the table under the diagram.

## Sub-features

- `flow-render` draws one link for each node in a group named after the diagram title, a legend and a details table.
- `flow-hover-card` opens a card on hover with the kind, the label, the description, the details and a hint.
- `flow-focus-card` opens the same card when a node gets the focus from the Tab key.
- `flow-arrow-keys` moves the focus to the nearest node in the direction of the arrow key.
- `flow-click-row` goes to `#<diagram id>-<node id>` for a node with a description or details and no `href`.
- `flow-click-href` goes to the `href` of a node, such as `#shipping-rules`.
- `flow-enter` does the same as a click when the node has the focus.

## How to get to it (user POV)

- Open a page with a `yaml flow` block. In this repo it is `/diagrams/flow/`, "The flow diagram", in the Diagrams section.
- Move the pointer over a node.
- Press Tab from the last nav link to reach the diagram, then use the arrow keys and Enter.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- `docs/diagrams/flow.md` in the site copy has the baseline "Order flow" example with 8 nodes.

- **Render.** Open the page. Steps `{"goto": "/diagrams/flow/"}` and `{"expectCount": {"target": {"css": "docs-flow-node a"}, "count": 8}}`. The snapshot has `group "Order flow"` with the links `Order placed`, `In stock?`, `Buy green beans`, `Roast batch`, `Cool and rest`, `Pack bags`, `Ship order` and `Coffee delivered`.
- **Hover card.** Hover `Roast batch`. Steps `{"hover": {"node": "Roast batch"}}` and `{"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "The roaster roasts one batch for the open orders."}}`. The card shows `Step`, `Roast batch`, the description, `Entry: The beans are weighed.`, `Exit: The batch is at the target color.` and `Click to go to its row below`.
- **Focus card.** Tab into the diagram. Steps `{"focus": {"role": "link", "name": "Write pages"}}`, `{"press": "Tab"}`, `{"expectFocused": {"role": "link", "name": "Order placed"}}` and `{"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "A customer orders a bag of coffee"}}`.
- **Arrow keys.** Move right, then down. Steps `{"press": "ArrowRight"}`, `{"expectFocused": {"role": "link", "name": "In stock?"}}`, `{"press": "ArrowDown"}` and `{"expectFocused": {"role": "link", "name": "Buy green beans"}}`.
- **Enter.** Press Enter on `Buy green beans`. Steps `{"press": "Enter"}` and `{"expectUrl": "#order-flow-buy$"}`.
- **Click to a row.** Steps `{"click": {"node": "Roast batch"}}` and `{"expectUrl": "#order-flow-roast$"}`. The row `#order-flow-roast` in `table.docs-flow-details` holds `Roast batch`.
- **Click to an href.** Steps `{"click": {"node": "Ship order"}}` and `{"expectUrl": "#shipping-rules$"}`. The heading `Shipping rules` is on the page.
- **Proof.** After the hover step, run `{"screenshot": "flow-hover"}` and `{"aria": "flow-hover"}`. The snapshot holds the card text under `group "Order flow"`.

## Gotchas

- A script `focus()` does not open the card. The card opens on keyboard focus. Focus the last nav link, `Write pages`, and press Tab.
- The card opens after a 250 ms delay and closes 150 ms after the pointer leaves. Wait for the card, not for a fixed time.
- The card text is also in the details table. A plain `text` target then matches two elements. Scope the target to `ui-hover-card-content:not([hidden])`.
- Only one node is in the Tab order at a time. Tab from a node leaves the diagram. Use the arrow keys inside it.
- `Cool and rest` has details but no description. `Ship order` has an `href` and no row.
