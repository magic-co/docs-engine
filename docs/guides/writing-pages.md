# Write pages

## Pages and titles

Each Markdown file in a section is a page. The title of a page is its first `#` heading. When a page has no `#` heading, its title is its file name.

## Routes

The route of a page comes from its path:

1. Remove `docs/` from the start.
2. Remove `.md` from the end.
3. Add a slash at the end.

For example, `docs/guides/writing-pages.md` has the route `/guides/writing-pages/`. `README.md` is the home page at `/`. `GLOSSARY.md` is at `/glossary/`.

A `docs/<section>/README.md` or `docs/<section>/index.md` file is the section page. Its route is the route of the folder.

## Links

Link to other pages with relative links to their Markdown files, such as `[the lint rules](layout-and-lint.md#rules)`. The links then work on GitHub too. The engine changes each link to the route of the page. A link to a heading uses the GitHub id of the heading.

## The nav

The nav comes from the folder tree:

- A folder is a section.
- A file is a page.
- The section page comes first. The other pages come next, in the alphabetical order of their titles.

To set the order by hand, start the file or folder name with a number and a hyphen, such as `docs/<section>/01-install.md`. Pages with a number come first, in number order. The engine removes the number from the route, so that page has the route `/<section>/install/`.

The `docs/adr/` section shows as "Decisions" in the nav. `GLOSSARY.md` shows as "Glossary", after all the sections. The research pages are in the site, but not in the nav. The agent files are not in the site.

On a screen narrower than 800px, the nav is closed. The Menu button opens it.
