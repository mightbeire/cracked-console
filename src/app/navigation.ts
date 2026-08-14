export type StaticAppSection =
  | "today"
  | "curriculum"
  | "proof"
  | "projects"
  | "skills"
  | "evidence"
  | "reading"
  | "practice"
  | "guide"
  | "progress"
  | "settings";

export type SidePathSection = `sidepath:${number}`;
export type AppSection = StaticAppSection | SidePathSection;

export interface NavigationItem {
  id: AppSection;
  label: string;
}

export const navigationItems: readonly NavigationItem[] = [
  { id: "today", label: "This Week" },
  { id: "curriculum", label: "Curriculum" },
  { id: "proof", label: "Proof" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "evidence", label: "Evidence" },
  { id: "reading", label: "Reading" },
  { id: "practice", label: "Practice" },
  { id: "guide", label: "Guide" },
  { id: "progress", label: "Progress" },
  { id: "settings", label: "Settings" },
];

export function sidePathSection(pathId: number): SidePathSection {
  return `sidepath:${pathId}`;
}

export function sidePathId(section: AppSection): number | null {
  if (!section.startsWith("sidepath:")) return null;
  const id = Number(section.slice("sidepath:".length));
  return Number.isInteger(id) && id > 0 ? id : null;
}
