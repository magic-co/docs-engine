# Gantt chart

A `yaml gantt` block becomes a chart of tasks on a time axis, in sections. Each row works like a flow node: a card on hover or keyboard focus with the dates, arrow keys, and a click to its row or its `href`.

## Sub-features

- `gantt-render` draws one row link for each task, with a bar for a task and a diamond for a milestone, in a group named after the title.
- `gantt-axis` labels the months on one row and the week days on the row under it. Labels do not overlap.
- `gantt-hover-card` opens a card with the section, the dates and the length, the description and the `After` task.
- `gantt-click` goes to the row of a task, or to its `href`.

## How to get to it (user POV)

- Open `/diagrams/gantt/`, "The Gantt chart", in the Diagrams section.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- `docs/diagrams/gantt.md` in the site copy has the baseline "Second shop" example with 6 tasks.

- **Render.** Steps `{"goto": "/diagrams/gantt/"}` and `{"expectCount": {"target": {"css": "docs-flow-node a"}, "count": 6}}`. The month labels read `MAR 2027`, `APR` and `MAY`, with no overlap.
- **Hover card.** Steps `{"hover": {"role": "link", "name": "Install the roaster"}}` and `{"expectVisible": {"css": "ui-hover-card-content:not([hidden])", "hasText": "Mar 22 – 25, 2027 (4 days)"}}`. The card also holds `The date cannot move.` and `After: Fit out the shop`.
- **Click to an href.** Steps `{"click": {"role": "link", "name": "Doors open"}}` and `{"expectUrl": "#opening-day$"}`.
- **Click to a row.** Steps `{"click": {"role": "link", "name": "Fit out the shop"}}` and `{"expectUrl": "#second-shop-fit$"}`.
- **Proof.** After the hover step, run `{"screenshot": "gantt-hover"}` and `{"aria": "gantt-hover"}`.

## Gotchas

- The dash in a date range is an en dash with spaces, as `Intl.DateTimeFormat` writes it.
- A task with no description and no details still gets a row, because the card gives its dates. `Fit out the shop` is one.
