# Figure

A `yaml figure` block runs a JavaScript module of the repo and puts its drawing in the page. The drawing keeps its own style and script, so it can move and respond to input. When the module fails, the page shows the error in place of the figure.

## Sub-features

- `figure-render` shows the HTML of the module, with its CSS, in a `.docs-figure` element.
- `figure-script` runs the script of the module in the page, so the drawing responds to a click.
- `figure-error` shows "This figure has an error:" and the reason when the module is missing or fails.

## How to get to it (user POV)

- Open a page with a `yaml figure` block. In this repo it is `/diagrams/figure/`, "The figure", in the Diagrams section.
- Click the drawing of the roast line, or press the Next machine button. The readout under it names the next machine.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- `docs/diagrams/figures/roast-line.mjs` in the site copy is the baseline module.

- **Render.** Steps `{"goto": "/diagrams/figure/"}` and `{"expectVisible": {"role": "img", "name": "The order flow as a line of machines"}}`. The readout `#roast-line-step` reads `Order placed`.
- **Script.** Steps `{"click": {"role": "img", "name": "The order flow as a line of machines"}}` and `{"expectEval": "document.getElementById('roast-line-step').textContent === 'In stock?'"}`.
- **Keyboard.** After the script step, run `{"focus": {"role": "button", "name": "Next machine"}}`, `{"press": "Enter"}` and `{"expectEval": "document.getElementById('roast-line-step').textContent === 'Buy green beans'"}`.
- **Error.** Run `printf 'throw new Error("no beans");\n' > "$DOCS_VERIFY_RUN/instance/site/docs/diagrams/figures/roast-line.mjs"`, then steps `{"goto": "/diagrams/figure/"}` and `{"expectVisible": {"text": "This figure has an error: the module failed: no beans"}}`. Run `control-docs restore docs/diagrams/figures/roast-line.mjs`.
- **Proof.** After the script step, run `{"screenshot": "figure-render"}` and `{"aria": "figure-render"}`.

## Gotchas

- The engine runs the module again for each page view, in a new Node process. A slow module makes each page view slow.
- The script finds its elements by an id or a class that only the figure uses. Two copies of one figure on a page share the id, so the second one does not respond.
- The lint checks the source of a figure. See the `lint-figures` recipe in [Lint the docs](./lint.md).
