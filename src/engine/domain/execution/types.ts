export type DayStatus =
  | "UPCOMING"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "COMPLETED_WITH_GAPS"
  | "REST"
  | "MISSED"
  | "REPAIR_REQUIRED";

export type BlockType = string;

export type BlockStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETE"
  | "SKIPPED"
  | "DEFERRED"
  | "FAILED"
  | "REPAIR_REQUIRED";

export type TimerState = "STOPPED" | "RUNNING" | "PAUSED";

export interface LearningLogDraft {
  learned: string;
  did: string;
  explainWithoutNotes: string;
  confused: string;
  nextAction: string;
}

export interface TodayBlock {
  id: number;
  type: BlockType;
  label: string;
  sortOrder: number;
  plannedMinutes: number;
  instructionsMarkdown: string;
  required: boolean;
  status: BlockStatus;
  actualMinutes: number;
  note: string;
  timer: {
    state: TimerState;
    accumulatedSeconds: number;
    startedAt: string | null;
  };
}

export interface TodayDodItem {
  id: number;
  sortOrder: number;
  text: string;
  required: boolean;
  complete: boolean;
}

export interface TodayDay {
  id: number;
  dayNumber: number;
  date: string;
  dateLabel: string;
  weekNumber: number;
  phaseNumber: number;
  isRestDay: boolean;
  status: DayStatus;
  startedAt: string | null;
  completedAt: string | null;
  blocks: TodayBlock[];
  dodItems: TodayDodItem[];
  learningLog: LearningLogDraft;
}

export type SchedulePosition =
  | { kind: "UNCONFIGURED" }
  | { kind: "PRE_START"; daysUntilStart: number }
  | { kind: "ACTIVE"; dayNumber: number }
  | { kind: "COMPLETE" };
