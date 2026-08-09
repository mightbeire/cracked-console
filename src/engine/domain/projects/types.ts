export type ProjectStatus =
  | "UPCOMING"
  | "NOT_STARTED"
  | "ACTIVE"
  | "READY_FOR_DEFENCE"
  | "COMPLETE";

export interface ProjectMilestone {
  id: number;
  sortOrder: number;
  title: string;
  description: string;
  completed: boolean;
  evidenceId: number | null;
  evidenceTitle: string | null;
  note: string;
  completedAt: string | null;
}

export interface ProjectRecord {
  id: number;
  code: string;
  name: string;
  coreIntegration: string;
  startDay: number;
  endDay: number;
  startDate: string;
  endDate: string;
  startDateLabel: string;
  endDateLabel: string;
  defenceAssessmentType: string;
  problemStatement: string;
  repositoryReference: string;
  workingNotes: string;
  startedAt: string | null;
  completedAt: string | null;
  passingDefenceCount: number;
  milestones: ProjectMilestone[];
}
