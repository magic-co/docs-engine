# The tree diagram

A tree diagram shows a hierarchy, such as a team chart. Each node names its parent. The engine places the nodes: a parent sits over the middle of its children. Two or more children that have no children of their own stack under their parent, so a wide team stays narrow. Write it as a `yaml tree` diagram block.

## Example

This made-up tree shows who reports to whom in a small coffee roastery. The block gets its data from [`data/team.mjs`](data/team.mjs), which reads [`data/team.yaml`](data/team.yaml). See [data from a module](README.md#data-from-a-module).

```yaml tree
from: data/team.mjs
```

The same tree, written in the block:

```yaml
title: Roastery team
relation: Reports to
nodes:
  owner: { label: Owner, note: Ada }
  head-roaster: { label: Head Roaster, parent: owner, note: Bo, details: { Tasks: [Roast each batch, Cup each batch] } }
  shop-lead: { label: Shop Lead, parent: owner, note: Cy }
```

## The yaml block

| Field | Required | What it holds |
| --- | --- | --- |
| `title` | yes | The title of the diagram. It also makes the ids of the rows. |
| `relation` | no | The words that join a node to its parent in its card and in its row, such as `Reports to`. Default: `Under`. |
| `nodes` | yes | A map from a node id to a node. Children show from left to right in this order. |

Each node has these fields:

| Field | Required | What it holds |
| --- | --- | --- |
| `label` | yes | The text in the node. |
| `parent` | no | The id of the parent node. A node with no parent is a root. A tree can have more than one root. |
| `note` | no | A short second line in the node, such as who fills it. |
| `description` | no | The text of the card and of the table row. |
| `details` | no | An ordered map of labels to a text or a list of texts. |
| `href` | no | The link target. Without it, a node with a `description` or `details` links to its row in the table. Other nodes have no link target. |

## Checks

The `diagrams` rule checks each tree block against the schema in `src/diagrams/tree/tree.schema.json`. The rule also checks that each `parent` names another node, and that the parents make no loop.
