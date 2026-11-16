import { readFileSync } from "node:fs";
import { parse } from "yaml";

const { people } = parse(readFileSync("docs/diagrams/data/team.yaml", "utf8"));

export default {
  title: "Roastery team",
  relation: "Reports to",
  nodes: Object.fromEntries(
    Object.entries(people).map(([id, person]) => [
      id,
      {
        label: person.role,
        ...(person.reports_to ? { parent: person.reports_to } : {}),
        note: person.name,
        details: { Tasks: person.tasks },
      },
    ]),
  ),
};
