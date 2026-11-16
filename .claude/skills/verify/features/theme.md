# Theme the site

The engine ships a default theme: the tokens, the shell styles and the Geist, Geist Mono and Instrument Serif fonts. A repo can set new token values and add rules in one CSS file. `theme` in `docs.config.json` names the file. The site loads it after the default theme.

## Sub-features

- `theme-default` loads the default tokens and the three fonts with no theme file.
- `theme-repo` loads the CSS file of `theme` after the default theme, so its token values win.
- `theme-live` updates an open `docs dev` page when the theme file changes, without a page reload.
- `theme-static` puts the theme file into the CSS bundle of `docs build`.
- `theme-config` stops with a config error when the theme file does not exist, is outside the repo, or is not a `.css` file.

## How to get to it (user POV)

- Add a CSS file such as docs/theme.css to the repo and set `"theme": "docs/theme.css"` in `docs.config.json`.
- Run `docs dev` and change the file while a page is open.
- Run `docs build` and open the static site.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- The site copy is in the baseline state. It has no theme file.

- **Default theme.** Step `{"goto": "/guides/writing-pages/"}`, then `{"expectEval": "getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim() === '#a14818' && document.fonts.check('16px Geist') && [...document.fonts].some(f => f.family === 'Instrument Serif' && f.status === 'loaded')"}`.
- **Add a theme.** Step `{"run": "printf ':root { --accent-text: #1f5a40; }\\n' > \"$DOCS_VERIFY_SITE/docs/theme.css\""}`, then a `run` step that writes `docs.config.json` with `"theme": "docs/theme.css"` and the baseline `title` and `lint`. Then `{"expectEval": "getComputedStyle(document.querySelector('nav a[aria-current=page]')).color === 'rgb(31, 90, 64)'", "timeout": 10000}`. The page reloads once for the config change.
- **Live update.** Step `{"eval": "window.__kept = 1"}`, change the theme file with a `run` step to `--accent-text: #6b2fa1`, then `{"expectEval": "getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim() === '#6b2fa1'", "timeout": 10000}` and `{"expectEval": "window.__kept === 1"}`. The second check proves that the page did not reload.
- **Static site.** Run `$S cli theme-build build`, then `$S static`. On the static URL, `expectEval` the same `--accent-text` value. `dist-site/assets/client.css` holds the default value first and the theme value after it.
- **Config error.** Remove the theme file, then run `$S cli theme-missing lint`. The exit code is 1 and stderr says `the theme file "docs/theme.css" does not exist`.
- **Cleanup.** Run `$S restore docs/theme.css docs.config.json`.

## Gotchas

- The theme file goes through Vite. A `url()` in it is relative to the file.
- A change to `docs.config.json` reloads the page. A change to the theme file does not; Vite swaps the CSS in place.
- The contrast unit test reads only the default theme. It does not check the theme file of a repo.
