import type { Details } from "../board.ts";

export interface TreeNode {
  label: string;
  parent?: string;
  note?: string;
  description?: string;
  details?: Details;
  href?: string;
}

export interface Tree {
  title: string;
  relation?: string;
  nodes: Record<string, TreeNode>;
}
