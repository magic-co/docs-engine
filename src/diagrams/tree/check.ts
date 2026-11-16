import type { Tree } from "./model.ts";

export function checkTree(tree: Tree): string[] {
  const problems: string[] = [];
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (node.parent === undefined) continue;
    if (node.parent === id) problems.push(`node \`${id}\` is its own parent`);
    else if (!Object.hasOwn(tree.nodes, node.parent)) problems.push(`node \`${id}\` names parent \`${node.parent}\`, which is not a node`);
  }
  if (problems.length > 0) return problems;
  const looped = new Set<string>();
  for (const id of Object.keys(tree.nodes)) {
    const path: string[] = [];
    for (let at: string | undefined = id; at !== undefined; at = tree.nodes[at]?.parent) {
      if (path.includes(at)) {
        const loop = path.slice(path.indexOf(at));
        if (!loop.some((member) => looped.has(member))) problems.push(`the parents of ${[...loop, at].map((member) => `\`${member}\``).join(" to ")} make a loop`);
        for (const member of loop) looped.add(member);
        break;
      }
      path.push(at);
    }
  }
  return problems;
}
