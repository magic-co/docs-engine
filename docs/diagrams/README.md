# Diagrams

A diagram is a fenced `yaml` code block with the diagram type after `yaml`. The engine checks the block and draws it in the page. The block holds the data. It does not hold a drawing.

| Type | Use it for | Page |
| --- | --- | --- |
| `flow` | The steps of a process and the paths between them. You place each node on a grid. | [The flow diagram](flow.md) |
| `tree` | A hierarchy, such as a team chart. The engine places the nodes. | [The tree diagram](tree.md) |
| `gantt` | Tasks on a time axis. The dates place the tasks. | [The Gantt chart](gantt.md) |
| `figure` | A drawing that a module of the repo makes, when no other type can show the idea. | [The figure](figure.md) |

## How a reader uses a diagram

The `flow`, `tree` and `gantt` types work the same way:

- Hover over a part, or focus it with the Tab key, to see its card.
- Use the arrow keys to move to the nearest part in that direction.
- Click a part, or press Enter, to go to its `href` or to its row in the table under the diagram.
- A part with a `description` or `details` gets a row in that table. A `details` value can be a text or a list of texts.

## Data from a module

A block can get its data from a JavaScript module of the repo. Then the block holds only `from`:

````markdown
```yaml tree
from: data/team.mjs
```
````

The path is relative to the page or to the repo root. The default export of the module, or the value of its promise, is the data of the block. The engine checks it as if it were in the block. Use `from` when the facts already live in another file, such as a YAML file of the repo. Then the diagram cannot drift from the facts.

The module runs in a new Node process, with the repo root as the working folder. `docs dev` runs it again for each page view. When the module fails, or its data breaks the schema, the `diagrams` rule fails.
