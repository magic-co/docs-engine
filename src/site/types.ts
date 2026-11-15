import type { Root } from "mdast";
import type { Area } from "./layout.ts";
import type { Config } from "./config.ts";
import type { GeneratedMark } from "../generated.ts";

export type RepoPath = string & { readonly __brand: "RepoPath" };
export type Route = string & { readonly __brand: "Route" };

export interface DiagramBlock {
  type: string;
  source: string;
  line: number;
}

export interface Page {
  path: RepoPath;
  route?: Route;
  title: string;
  area: Area;
  tree: Root;
  diagrams: DiagramBlock[];
  generated?: GeneratedMark;
}

export interface NavNode {
  title: string;
  route?: Route;
  children: NavNode[];
}

export interface Site {
  root: string;
  config: Config;
  title: string;
  pages: Map<RepoPath, Page>;
  routes: Map<Route, Page>;
  nav: NavNode;
}

export type Severity = "error" | "warning";

export interface Finding {
  rule: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
}
