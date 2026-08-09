export type AssessmentType = string;

export type AssessmentStatus = "PASS" | "REPAIR_REQUIRED" | "RECORDED";

export type AssessmentErrorCategory =
  | "KNOWLEDGE"
  | "REASONING"
  | "MEMORY"
  | "CARELESS_EXECUTION"
  | "MISREAD"
  | "AI_OVERRELIANCE";

export interface ScheduledProof {
  key: string;
  dayId: number;
  dayNumber: number;
  weekNumber: number;
  dateLabel: string;
  blockId: number;
  title: string;
  assessmentType: AssessmentType;
  instructionsMarkdown: string;
}

export interface AssessmentAttempt {
  id: number;
  assessmentType: AssessmentType;
  dayNumber: number | null;
  weekNumber: number | null;
  dateLabel: string | null;
  attemptNumber: number;
  score: number;
  maxScore: number;
  independent: boolean;
  status: AssessmentStatus;
  notes: string;
  parentAssessmentId: number | null;
  createdAt: string;
  errorCategories: AssessmentErrorCategory[];
}

export interface RepairTask {
  id: number;
  assessmentId: number | null;
  sourceDayId: number | null;
  dayNumber: number | null;
  reason: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  dependencyRisk: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ACCEPTED" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  completedAt: string | null;
  resolutionNote: string | null;
}

export interface AssessmentDraft {
  sourceDayId: number | null;
  sourceWeekNumber: number | null;
  assessmentType: AssessmentType;
  parentAssessmentId?: number | null;
  repairTaskId?: number | null;
  score: number;
  maxScore: number;
  independent: boolean;
  notes: string;
  errorCategories: AssessmentErrorCategory[];
}
