export interface ProgressActivity {
  id: number;
  eventType: string;
  summary: string;
  createdAt: string;
}

export interface SkillLevelCount {
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
}

export interface ProgressSnapshot {
  totalWeeks: number;
  elapsedWeeks: number;
  provenWeeks: number;
  totalActiveDays: number;
  elapsedActiveDays: number;
  completedActiveDays: number;
  completedRequiredBlocks: number;
  elapsedRequiredBlocks: number;
  trackedMinutes: number;
  assessmentAttempts: number;
  passingAttempts: number;
  openRepairs: number;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  projectsCompleted: number;
  totalProjects: number;
  readingComplete: number;
  readingTotal: number;
  practiceLessonsComplete: number;
  practiceLessonsTotal: number;
  totalSkills: number;
  skillLevels: SkillLevelCount[];
  recentActivity: ProgressActivity[];
}
