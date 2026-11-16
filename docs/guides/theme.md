# Theme a site

The engine ships a default theme. Each repo can change it with one CSS file. All repos use the same tokens, so a change of brand is a change of values, not of rules.

## Add a theme file

1. Make a CSS file in the repo, such as docs/theme.css.
2. Set `theme` in `docs.config.json` to its path from the repo root:

```json
{
  "title": "Roastery docs",
  "theme": "docs/theme.css"
}
```

The site loads the theme file after the default theme, so its rules win. `docs dev` shows a change to the file at once. `docs build` puts the file into the CSS bundle of the site, after the default theme. A `url()` in the file is relative to the file, as in any CSS file. The build puts each file that a `url()` names into the CSS too.

## Set the tokens

Set new token values on `:root`. Change a token before you write a new rule, so that the pages and the diagrams change together.

```css
:root {
  --accent: #2f7d5b;
  --accent-text: #1f5a40;
  --accent-tint: rgba(47, 125, 91, 0.08);
  --selection: rgba(47, 125, 91, 0.22);
}
```

| Token | What it sets |
| --- | --- |
| `--paper` | The page background. |
| `--paper-2` | The background of a hovered nav link and of an open control. |
| `--card` | The background of code, figures and hover cards. |
| `--ink` | The body text and the headings. |
| `--muted` | Secondary text, such as the nav links and the first paragraph of a page. |
| `--soft-text` | Small labels, such as the nav section names. |
| `--soft` | Lines and marks in diagrams. |
| `--rule` | Thin dividers and borders. |
| `--rule-solid` | Stronger borders, such as controls and quotes. |
| `--accent` | The brand color in diagrams and errors. |
| `--accent-text` | The brand color for text and focus rings. It needs 4.5:1 contrast on `--paper`. |
| `--accent-tint` | The background of the current nav link. |
| `--selection` | The background of selected text. |
| `--link` | Links. |
| `--link-rule` | The border of a code span inside a link. |
| `--sans` | The body font. |
| `--mono` | Code, labels and table heads. |
| `--display` | The page title and the site title. |
| `--radius` | The corner radius of code blocks, controls and errors. |
| `--nav-width` | The width of the nav column. |
| `--page-width` | The width of the page column, figures and tables. |
| `--measure` | The width of paragraphs and lists. Keep it near 70 to 80 characters. |

## Add rules

Put new rules in the same file. Use the class names of the shell, such as `.docs-nav`, `.docs-page` and `.docs-footer`. A rule on a class can break when the engine changes its markup, but a token stays. So prefer a token.

## Fonts

The default theme loads Geist, Geist Mono and Instrument Serif from the engine. To use another font, add an `@font-face` rule with a `url()` to a font file in the repo, then set `--sans`, `--mono` or `--display`.
