# The Gantt chart

A Gantt chart shows tasks on a time axis, in sections. The dates place the tasks. Write it as a `yaml gantt` diagram block.

## Example

This made-up chart shows how a small coffee roastery opens a second shop.

```yaml gantt
title: Second shop
sections:
  build: { label: Build }
  open: { label: Open }
tasks:
  lease: { label: Sign the lease, section: build, on: 2027-02-26, description: The landlord signs on the last Friday of February. }
  fit: { label: Fit out the shop, section: build, start: 2027-03-01, weeks: 3 }
  roaster: { label: Install the roaster, section: build, after: fit, days: 4, focal: true, description: The roaster comes from the importer. The date cannot move. }
  train: { label: Train the baristas, section: open, after: roaster, weeks: 1 }
  doors: { label: Doors open, section: open, after: train, href: "#opening-day" }
  menu: { label: Spring menu, section: open, start: 2027-04-12, end: 2027-05-30 }
```

## Opening day

The shop opens on the day after the last training day. This heading is the `href` target of the "Doors open" milestone.

## The yaml block

| Field | Required | What it holds |
| --- | --- | --- |
| `title` | yes | The title of the chart. It also makes the ids of the rows. |
| `sections` | yes | A map from a section id to `{ label }`, in order. Each section is a group of rows. |
| `tasks` | yes | A map from a task id to a task. The tasks show in this order in each section. |

Each task has these fields:

| Field | Required | What it holds |
| --- | --- | --- |
| `label` | yes | The text of the row. |
| `section` | yes | The id of a section. |
| `on`, `start` or `after` | one of the three | `on`: the date of a milestone. `start`: the first day. `after`: a task id. The task starts on the day after that task ends. |
| `end`, `days` or `weeks` | no | The last day (inclusive), or the length. A task with no `on` and no end is a milestone. A milestone `after` a task sits on its last day. |
| `focal` | no | `true` for the one task that stands out, such as the date that cannot move. |
| `description` | no | The text of the card and of the table row. |
| `details` | no | An ordered map of labels to a text or a list of texts. The card and the row also give the dates. |
| `href` | no | The link target. Without it, the task links to its row in the table. |

Dates use the form `YYYY-MM-DD`. A chart of up to 120 days has a tick each week. A longer chart has a tick each month. It labels each month, quarter, half year or year, as the space allows.

## Checks

The `diagrams` rule checks each Gantt block against the schema in `src/diagrams/gantt/gantt.schema.json`. The rule also checks these rules:

- Each task names a section, and each section has one or more tasks.
- Each task has one start: `on`, `start` or `after`. It has one end at most, and a task with `on` has no end.
- Each date is a real date, and no task ends before it starts.
- Each `after` names a task, and the `after` values make no loop.
