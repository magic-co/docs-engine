import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach } from "vitest";

export type Files = Record<string, string | null>;

const FLOW = `\`\`\`yaml flow
title: Order flow
nodes:
  order: { label: Order placed, kind: start, at: [0, 0] }
  roast: { label: Roast batch, kind: step, at: [1, 0], group: kitchen, description: The roaster roasts the beans., details: { Entry: Beans are weighed, Exit: Beans are cool } }
  pack: { label: Pack bag, kind: step, at: [2, 0], group: kitchen, href: ../guides/01-roasting.md#cool-the-beans }
  ship: { label: Ship, kind: end, at: [3, 0] }
groups:
  kitchen: { label: Roast room }
edges:
  - { from: order, to: roast }
  - { from: roast, to: pack, label: cooled }
  - { from: pack, to: ship }
\`\`\`
`;

export const CLEAN: Files = {
  "README.md": "# Roastery docs\n\nThe docs of a small coffee roastery. Read the [guides](docs/guides/README.md).\n",
  "GLOSSARY.md": "# Glossary\n\n## Roast batch\n\nOne load of the roaster.\n\n**Green bean**: a bean before the roast.\n",
  "AGENTS.md": "# Agents\n\nRun the lint. See [the agent notes](docs/agents/README.md).\n",
  "docs/adr/0002-ship-on-monday.md": "# Ship on Monday\n",
  "docs/adr/0001-small-batches.md": "# Roast in small batches\n",
  "docs/research/README.md": "# Research\n\nSee [bean sources](bean-sources.md).\n",
  "docs/research/bean-sources.md": "# Bean sources\n",
  "docs/agents/README.md": "# Agent notes\n",
  "docs/guides/README.md": "# Guides\n\nStart with [roasting](01-roasting.md#cool-the-beans).\n",
  "docs/guides/02-shipping.md": "# Ship an order\n\nUse `docs/guides/01-roasting.md` first.\n",
  "docs/guides/01-roasting.md": "# Roast a batch\n\n## Cool the beans\n\nCool them for a Roast batch. A Roast batch is small.\n",
  "docs/guides/cupping.md": "# Taste the coffee\n",
  "docs/guides/brewing.md": "# Brew a cup\n",
  "docs/guides/tools/README.md": "# Tools\n",
  "docs/orders/flow.md": `# Orders\n\n${FLOW}`,
};

const made: string[] = [];

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

export function repo(changes: Files = {}): string {
  const root = mkdtempSync(join(tmpdir(), "docs-engine-"));
  made.push(root);
  for (const [path, text] of Object.entries({ ...CLEAN, ...changes })) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
