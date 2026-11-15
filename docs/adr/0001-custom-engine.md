# Use a small custom engine

## Status

Accepted.

## Context

Each repo needs the same docs layout, the same look, interactive diagrams and a lint that blocks a bad change. A docs framework, such as Starlight, VitePress or Docusaurus, gives a site quickly. But each framework has its own layout rules, its own theme system and its own plugin model. The interactive flow diagram and the layout lint do not fit well in them. A framework upgrade can also break all repos at one time.

## Decision

Build a small engine on unified (remark and rehype) for Markdown, and on Vite for the dev server and the client bundle. Use `yaml` and `ajv` for the diagram blocks. Use UI SDK for the interactive parts.

The engine parses each repo one time into one Site model. The `dev`, `build` and `lint` commands all read that model.

## Consequences

- We own the page shell, the nav and the theme. They are small.
- A new lint rule or diagram type is one entry in a registry.
- We do not get framework features such as search or versions. We can add them when a repo needs them.
