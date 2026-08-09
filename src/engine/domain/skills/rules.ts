import type { SkillEvidenceSignal, SkillLevel } from "./types";

export interface LevelDefinition {
  level: SkillLevel;
  label: string;
  meaning: string;
}

export const SKILL_LEVELS: readonly LevelDefinition[] = [
  { level: 0, label: "L0 - Untrained", meaning: "No dependable independent ability yet." },
  { level: 1, label: "L1 - Foundation", meaning: "Basic guided proof." },
  { level: 2, label: "L2 - Functional", meaning: "Repeated independent ordinary work." },
  { level: 3, label: "L3 - Strong", meaning: "Unfamiliar problems + integrated project + delayed retention." },
  { level: 4, label: "L4 - Advanced", meaning: "Difficult unfamiliar proof + project/defence + delayed retention + repeated success." },
] as const;

export interface SkillLevelValidation {
  valid: boolean;
  reasons: string[];
}

export function validateSkillLevel(
  level: SkillLevel,
  evidence: readonly SkillEvidenceSignal[],
  rationale: string,
): SkillLevelValidation {
  if (level === 0) return { valid: true, reasons: [] };

  const reasons: string[] = [];
  const verified = evidence.filter((item) => item.verified).length;
  const weeks = new Set(evidence.map((item) => item.weekNumber).filter((value): value is number => value !== null));
  const hasPassingAssessment = evidence.some((item) => item.hasPassingAssessment);
  const hasStrongAssessment = evidence.some((item) => item.hasStrongAssessment);
  const hasCompletedProject = evidence.some((item) => item.hasCompletedProject);

  if (level >= 1 && evidence.length < 1) reasons.push("L1+ requires at least one linked evidence item.");

  if (level >= 2) {
    if (evidence.length < 2) reasons.push("L2+ requires repeated evidence: at least two items.");
    if (verified < 1) reasons.push("L2+ requires at least one verified evidence item.");
  }

  if (level >= 3) {
    if (evidence.length < 3) reasons.push("L3+ requires at least three evidence items.");
    if (verified < 2) reasons.push("L3+ requires at least two verified evidence items.");
    if (weeks.size < 2) reasons.push("L3+ requires evidence across at least two different weeks.");
    if (!hasPassingAssessment) reasons.push("L3+ requires evidence linked to a passing assessment.");
    if (!hasCompletedProject) reasons.push("L3+ requires evidence from a completed integrated project.");
  }

  if (level === 4) {
    if (evidence.length < 5) reasons.push("L4 requires at least five evidence items.");
    if (verified < 4) reasons.push("L4 requires at least four verified evidence items.");
    if (weeks.size < 3) reasons.push("L4 requires repeated evidence across at least three different weeks.");
    if (!hasStrongAssessment) reasons.push("L4 requires a passing defence, final, or delayed-retention assessment.");
    if (rationale.trim().length < 80) reasons.push("L4 requires an evidence-based rationale of at least 80 characters.");
  }

  return { valid: reasons.length === 0, reasons };
}
