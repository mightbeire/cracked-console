export type AppSection =
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

export interface NavigationItem {
  id: AppSection;
  label: string;
}

export const navigationItems: readonly NavigationItem[] = [
  { id: "today", label: "Today" },
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
