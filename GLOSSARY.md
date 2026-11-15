# Glossary

## Site

The model of one repo that the engine builds. `loadSite` makes it. The `dev`, `build` and `lint` commands all read the same Site.

## Page

One Markdown file of the repo, with its route, its title, its area and its parsed tree. A page that is not in the site has no route.

## Area

The part of the layout that a page belongs to, such as `home`, `adr` or `research`. One layout table holds all areas. The table tells if a page is in the site and in the nav.

## Section

A folder under `docs/`. A section shows in the nav with its pages. Its README.md or index.md file is the section page.

## Diagram block

A fenced code block whose info string is `yaml <type>`, such as `yaml flow`. The engine draws it as a diagram.

## Diagram type

One entry in the diagram registry. It has a JSON Schema, a check for references, and a render function.

## Rule

One lint check. It has an id, a severity and a check function. All rules are in one registry.

## Finding

One problem that a rule found. It has the rule, the severity, the file, the line and a message.

## Generated page

A page that a tool writes. It starts with a mark that holds its source and a hash. The lint fails when someone edits the page by hand.

## Source plugin

A tool that writes generated pages from another source, such as a schema or an API. Source plugins come in a later step.
