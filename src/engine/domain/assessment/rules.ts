import type { AssessmentStatus, AssessmentType } from "./types";

export const DEFAULT_PASS_RATIO = 0.7;

export function assessmentRatio(score: number, maxScore: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return 0;
  return Math.max(0, score) / maxScore;
}

export function determineAssessmentStatus(score: number, maxScore: number): AssessmentStatus {
  return assessmentRatio(score, maxScore) >= DEFAULT_PASS_RATIO ? "PASS" : "REPAIR_REQUIRED";
}

export function inferAssessmentType(title: string): AssessmentType {
  const upper = title.toUpperCase();
  if (upper.includes("FINAL CAPSTONE DEFENCE")) return "CAPSTONE_DEFENCE";
  if (upper.includes("FINAL EXAM")) return "FINAL_EXAM";
  if (upper.includes("QUARTER") && upper.includes("EXAM")) return "QUARTERLY_EXAM";
  if (upper.includes("PROJECT") && upper.includes("DEFENCE")) return "PROJECT_DEFENCE";
  if (upper.includes("MONTHLY") && upper.includes("CHECK")) return "MONTHLY_CHECK";
  if (upper.includes("LANGUAGE") && upper.includes("FINAL")) return "LANGUAGE_FINAL";
  if (upper.includes("COGNITIVE") && upper.includes("FINAL")) return "COGNITIVE_FINAL";
  if (upper.includes("PROOF")) return "WEEKLY_PROOF";
  if (upper.includes("DEFENCE")) return "PROJECT_DEFENCE";
  if (upper.includes("CHECK")) return "MONTHLY_CHECK";
  if (upper.includes("EXAM")) return "QUARTERLY_EXAM";
  return "OTHER";
}

export function isAssessmentHeading(title: string): boolean {
  return /\b(PROOF|EXAM|DEFENCE|CHECK)\b/i.test(title);
}

export function assessmentTypeLabel(type: AssessmentType): string {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
