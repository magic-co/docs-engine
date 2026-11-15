import type { Flow } from "./model.ts";

export function checkFlow(flow: Flow): string[] {
  const groups = flow.groups ?? {};
  const problems: string[] = [];
  for (const id of Object.keys(groups)) {
    if (Object.hasOwn(flow.nodes, id)) problems.push(`\`${id}\` is the id of a node and of a group`);
    if (!Object.values(flow.nodes).some((node) => node.group === id)) problems.push(`group \`${id}\` has no nodes`);
  }
  const cells = new Map<string, string>();
  for (const [id, node] of Object.entries(flow.nodes)) {
    if (node.group !== undefined && !Object.hasOwn(groups, node.group)) problems.push(`node \`${id}\` names group \`${node.group}\`, which does not exist`);
    const cell = node.at.join(",");
    if (cells.has(cell)) problems.push(`nodes \`${cells.get(cell)}\` and \`${id}\` use the same cell [${cell}]`);
    cells.set(cell, id);
  }
  flow.edges.forEach((edge, index) => {
    if (!Object.hasOwn(flow.nodes, edge.from)) problems.push(`edge ${index + 1} starts at \`${edge.from}\`, which is not a node`);
    if (!Object.hasOwn(flow.nodes, edge.to) && !Object.hasOwn(groups, edge.to)) problems.push(`edge ${index + 1} goes to \`${edge.to}\`, which is not a node or a group`);
    if (edge.from === edge.to) problems.push(`edge ${index + 1} goes from \`${edge.from}\` to itself`);
  });
  return problems;
}
