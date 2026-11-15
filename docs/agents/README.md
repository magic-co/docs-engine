# Agent notes

These notes are for agents. They are not in the site.

- The engine has one model, the Site. Do not add a second parser. Read the [glossary](../../GLOSSARY.md).
- To add a lint rule, add one file in `src/lint/rules/` and add it to the registry in `src/lint/index.ts`.
- To add a diagram type, add a folder in `src/diagrams/` and add it to the registry in `src/diagrams/index.ts`. Put its client parts in `components/`.
- To change the fixed layout, change the table in `src/site/layout.ts`. The lint, the nav and the routes read it.
- Test through the public surface: `loadSite`, `lint`, the rendered HTML and the CLI.
