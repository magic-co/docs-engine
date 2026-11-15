# The flow diagram

A flow diagram shows the steps of a process and the paths between them. Write it as a `yaml flow` diagram block. The engine draws it as an SVG with one interactive node for each step.

## Example

This made-up flow shows how a small coffee roastery handles an order.

```yaml flow
title: Order flow
nodes:
  order:
    label: Order placed
    kind: start
    at: [0, 0]
    description: A customer orders a bag of coffee in the web shop.
  stock:
    label: In stock?
    kind: decision
    at: [1, 0]
    description: The roaster checks the green beans for the order.
  buy:
    label: Buy green beans
    kind: step
    at: [1, 1]
    description: The roaster orders green beans from the importer.
    details:
      Entry: The stock is too low for the order.
      Exit: The beans are in the store room.
  roast:
    label: Roast batch
    kind: step
    at: [2, 0]
    group: roastery
    description: The roaster roasts one batch for the open orders.
    details:
      Entry: The beans are weighed.
      Exit: The batch is at the target color.
  cool:
    label: Cool and rest
    kind: step
    at: [3, 0]
    group: roastery
    details:
      Entry: The batch leaves the drum.
      Exit: The beans rested for 12 hours.
  pack:
    label: Pack bags
    kind: step
    at: [3, 1]
    group: roastery
    description: The packer fills, seals and labels each bag.
  ship:
    label: Ship order
    kind: step
    at: [4, 1]
    href: "#shipping-rules"
  done:
    label: Coffee delivered
    kind: goal
    at: [4, 2]
    description: The customer has fresh coffee.
groups:
  roastery:
    label: Roast room
edges:
  - { from: order, to: stock }
  - { from: stock, to: roast, label: "yes" }
  - { from: stock, to: buy, label: "no", side: true }
  - { from: buy, to: roast, side: true }
  - { from: roast, to: cool }
  - { from: cool, to: pack }
  - { from: pack, to: ship }
  - { from: ship, to: done }
```

Hover over a node, or focus it with the Tab key, to see its card. Use the arrow keys to move to the nearest node in that direction. Click a node, or press Enter, to go to its `href` or to its row in the table under the diagram.

## Shipping rules

The roastery ships orders on weekdays. This heading is the `href` target of the "Ship order" node.

## The yaml block

| Field | Required | What it holds |
| --- | --- | --- |
| `title` | yes | The title of the diagram. It also makes the ids of the rows. |
| `nodes` | yes | A map from a node id to a node. |
| `groups` | no | A map from a group id to `{ label }`. A group draws a box around its nodes. |
| `edges` | yes | A list of `{ from, to, label, side }`. `from` is a node id. `to` is a node id or a group id. `side: true` draws a dashed line for a side path. |

Each node has these fields:

| Field | Required | What it holds |
| --- | --- | --- |
| `label` | yes | The text in the node. |
| `kind` | yes | `start`, `step`, `decision`, `end` or `goal`. |
| `at` | yes | The grid cell `[column, row]`, from 0. |
| `group` | no | The id of a group. |
| `description` | no | The text of the card and of the table row. |
| `details` | no | An ordered map of labels to text, such as `Entry` and `Exit`. |
| `href` | no | The link target. Without it, the node links to its row in the table. |

The engine prints a table row for each node that has a `description` or `details`. The id of the row is `<diagram id>-<node id>`. The diagram id comes from the title, so the "Roast batch" row above has the id `order-flow-roast`.

## Checks

The `diagrams` rule checks each flow block. The block must match the schema in `src/diagrams/flow/flow.schema.json`. The rule also checks these references:

- Each edge starts at a node.
- Each edge goes to a node or a group.
- Each `group` of a node names a group.
- No node and group have the same id.
- Each group has one or more nodes.
- No two nodes use the same cell.

When a block has an error, `docs dev` shows the error in the page. `docs lint` and `docs build` fail.
