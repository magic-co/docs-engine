import type { RepoPath } from "./types.ts";

type Visibility = "nav" | "linked" | "hidden";

type Place =
  | { kind: "file"; path: string; route?: string }
  | { kind: "folder"; path: string }
  | { kind: "any-folder"; under: string };

export interface Area {
  name: "home" | "glossary" | "agents" | "adr" | "research" | "docs";
  place: Place;
  visibility: Visibility;
  required: boolean;
  section?: string;
}

export const DOCS_DIR = "docs";
export const ASSETS_DIR = "assets";

export const LAYOUT: readonly Area[] = [
  { name: "home", place: { kind: "file", path: "README.md", route: "/" }, visibility: "nav", required: true },
  { name: "glossary", place: { kind: "file", path: "GLOSSARY.md", route: "/glossary/" }, visibility: "nav", required: true },
  { name: "agents", place: { kind: "file", path: "AGENTS.md" }, visibility: "hidden", required: true },
  { name: "adr", place: { kind: "folder", path: "docs/adr" }, visibility: "nav", required: true, section: "Decisions" },
  { name: "research", place: { kind: "folder", path: "docs/research" }, visibility: "linked", required: true },
  { name: "agents", place: { kind: "folder", path: "docs/agents" }, visibility: "hidden", required: true },
  { name: "docs", place: { kind: "any-folder", under: DOCS_DIR }, visibility: "nav", required: false },
];

export function areaOf(path: RepoPath): Area | undefined {
  return LAYOUT.find(({ place }) => {
    switch (place.kind) {
      case "file":
        return path === place.path;
      case "folder":
        return path.startsWith(`${place.path}/`);
      case "any-folder":
        return path.startsWith(`${place.under}/`) && path.split("/").length > 2;
    }
  });
}
