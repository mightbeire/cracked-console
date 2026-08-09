export type SkillFamily = string;

export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export interface SkillEvidenceSignal {
  id: number;
  title: string;
  verified: boolean;
  weekNumber: number | null;
  hasPassingAssessment: boolean;
  hasStrongAssessment: boolean;
  hasCompletedProject: boolean;
}

export interface SkillRecord {
  id: number;
  code: string;
  name: string;
  family: SkillFamily;
  sortOrder: number;
  level: SkillLevel;
  rationale: string;
  assignedAt: string | null;
  assignmentEvidenceCount: number;
}

export interface SkillAssignmentDraft {
  skillId: number;
  level: SkillLevel;
  rationale: string;
  evidenceIds: number[];
}
