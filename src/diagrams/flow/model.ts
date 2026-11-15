export const KINDS = {
  start: "Start",
  step: "Step",
  decision: "Decision",
  end: "End",
  goal: "Goal",
} as const;

export type Kind = keyof typeof KINDS;

export interface FlowNode {
  label: string;
  kind: Kind;
  at: [number, number];
  group?: string;
  description?: string;
  details?: Record<string, string>;
  href?: string;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  side?: boolean;
}

export interface Flow {
  title: string;
  nodes: Record<string, FlowNode>;
  groups?: Record<string, { label: string }>;
  edges: FlowEdge[];
}
