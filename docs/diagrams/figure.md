# The figure

A figure is a drawing that a JavaScript module in the repo makes. Use a figure when a [flow diagram](flow.md) cannot show the idea, for example a drawing of a machine with motion. Write it as a `yaml figure` block.

## Example

This figure draws the [order flow](flow.md#example) of the made-up roastery as a line of machines. Its module is [`figures/roast-line.mjs`](figures/roast-line.mjs).

```yaml figure
module: figures/roast-line.mjs
source: flow.md#order-flow
```

## The yaml block

| Field | Required | What it holds |
| --- | --- | --- |
| `module` | yes | The path of the module, relative to the page or to the repo root. |
| `source` | one of the two | What the figure draws. See [the source](#the-source). |
| `illustration` | one of the two | `true` when the figure states no facts, so it has no source. |

## The module

The default export of the module is an object, or a promise of an object, with these fields:

| Field | Required | What it holds |
| --- | --- | --- |
| `html` | yes | The HTML of the figure. |
| `script` | no | The text of a module script. The page runs it after the HTML. |
| `css` | no | The CSS of the figure. |

The engine runs the module in a new Node process, with the repo root as the working folder. So the module can read files of the repo. `docs dev` runs the module again for each page view, and reloads the page when a `.mjs`, `.js`, `.json`, `.yaml`, `.yml` or `.svg` file changes.

The script of each figure runs in the page, as a module script. Find the elements of the figure by a class or an id that only the figure uses.

## The source

A figure that states facts must name its source, so that the drawing and the facts cannot drift apart. The `figures` lint rule checks the source:

- `#<flow id>` or `<page>.md#<flow id>` names a flow diagram. The flow id is the slug of the flow title, such as `order-flow` for "Order flow". The figure must show the label of each node of the flow. The rule reads the text of the HTML and the `aria-label`, `title` and `alt` values.
- Any other path names a file, such as a YAML file that the module reads. The file must exist in the repo.

When the source changes, the lint fails until the figure shows the new facts.

## Checks

The `diagrams` rule checks the block against the schema in `src/diagrams/figure/figure.schema.json`. A block has a `source` or `illustration: true`, not both. The `figures` rule then checks that the module exists, that it runs, that its default export has an `html` string, and that the figure matches its source.
