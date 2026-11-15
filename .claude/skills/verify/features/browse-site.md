# Browse the site

`docs dev` serves the docs of a repo as a site on 127.0.0.1. The nav comes from the folder tree. Each Markdown page has a route. Agent files are not in the site.

## Sub-features

- `site-home` serves `README.md` at `/` with the site title from `docs.config.json`.
- `site-nav` shows the sections and pages from the folder tree, with `docs/adr/` as "Decisions" and the current page marked.
- `site-routes` serves each page at its route, such as `/guides/writing-pages/` and `/glossary/`.
- `site-redirect` answers a route without the end slash with a 301 to the route with the slash.
- `site-research` serves `docs/research/` but keeps it out of the nav. The footer links to it.
- `site-hidden` answers 404 for `AGENTS.md` and `docs/agents/`.
- `site-404` shows a "Page not found" page with a link home.

## How to get to it (user POV)

- Run `docs dev` in a repo and open the URL that it prints.
- Choose a link in the `Docs` nav.
- Type a route in the address bar.

## Driving it with control-docs

Preconditions:

- `control-docs doctor` ends with `doctor: healthy`.
- The site copy is in the baseline state.

- **Home.** Open `/`. Step `{"goto": "/"}`, then `{"expectVisible": {"role": "heading", "name": "docs-engine"}}`. The log shows `status 200`. The page title is `docs-engine`.
- **Nav.** Read the nav. Step `{"aria": "home"}`. The snapshot has `navigation "Docs"` with the groups `Decisions`, `Diagrams`, `Guides` and the link `Glossary`. It has no `Research` and no `Agent notes` entry.
- **Open a page from the nav.** Choose `Write pages`. Steps `{"click": {"role": "link", "name": "Write pages"}}`, `{"expectUrl": "/guides/writing-pages/$"}`, `{"expectVisible": {"css": "nav a[aria-current=page]", "hasText": "Write pages"}}`. The page heading is `Write pages`.
- **Glossary.** Step `{"goto": "/glossary/"}`. The log shows `status 200`.
- **Slash redirect.** Run `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$(cat $DOCS_VERIFY_RUN/instance/url)/guides"`. The output is `301 <url>/guides/`.
- **Research.** Step `{"click": {"role": "link", "name": "Research"}}` from any page. The URL ends in `/research/` and the page has status 200.
- **Hidden pages.** Steps `{"goto": "/agents/"}` and `{"goto": "/AGENTS/"}`. Each log line shows `status 404`.
- **404 page.** Step `{"goto": "/no-such-page/"}`, then `{"expectVisible": {"role": "heading", "name": "Page not found"}}` and `{"click": {"role": "link", "name": "Go to the home page"}}`. The URL ends in `/`.
- **Proof.** Steps `{"aria": "nav"}` and `{"screenshot": "nav"}` on `/guides/writing-pages/`. The artifacts show the nav and the current page.

## Gotchas

- The dev server answers only for routes without a file extension. A request such as `/README.md` goes to Vite, not to the docs routes.
- The site title comes from `docs.config.json`. Without a `title` there, it is the first heading of `README.md`.
- The nav sorts pages by title, not by file name. A number prefix such as `01-` sets the order and is not in the route.
- `docs dev` uses the next free port when the port is in use. Always read the URL from `start`, not from the port that you asked for.
