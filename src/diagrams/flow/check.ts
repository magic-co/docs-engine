import type { Flow } from "./model.ts";

export function checkFlow(flow: Flow): string[] {
  const groups = flow.groups ?? {};
  const problems: string[] = [];
  for (const id of Object.keys(groups)) {
    if (id in flow.nodes) problems.push(`\`${id}\` is the id of a node and of a group`);
    if (!Object.values(flow.nodes).some((node) => node.group === id)) problems.push(`group \`${id}\` has no nodes`);
  }
  const cells = new Map<string, string>();
  for (const [id, node] of Object.entries(flow.nodes)) {
    if (node.group !== undefined && !(node.group in groups)) problems.push(`node \`${id}\` names group \`${node.group}\`, which does not exist`);
    const cell = node.at.join(",");
    const other = cells.get(cell);
    if (other) problems.push(`nodes \`${other}\` and \`${id}\` use the same cell [${cell}]`);
    cells.set(cell, id);
  }
  flow.edges.forEach((edge, index) => {
    if (!(edge.from in flow.nodes)) problems.push(`edge ${index + 1} starts at \`${edge.from}\`, which is not a node`);
    if (!(edge.to in flow.nodes) && !(edge.to in groups)) problems.push(`edge ${index + 1} goes to \`${edge.to}\`, which is not a node or a group`);
  });
  return problems;
}
