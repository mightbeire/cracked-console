export type ReadingStatus = "NOT_STARTED" | "READING" | "REPORT_DUE" | "COMPLETE";

export interface ReadingReport {
  recall: string;
  coreIdea: string;
  bespokeResponse: string;
  evidenceNotes: string;
  pushBack: string;
  connection: string;
  keepOne: string;
  updatedAt: string | null;
}

export interface ReadingBook {
  id: number;
  monthId: number | null;
  slot: number;
  title: string;
  author: string;
  isShort: boolean;
  isBonus: boolean;
  isReread: boolean;
  bespokeAssignment: string;
  status: ReadingStatus;
  startedAt: string | null;
  completedAt: string | null;
  report: ReadingReport;
}

export interface ReadingMonth {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  requiredCount: number;
  books: ReadingBook[];
}

export interface ReadingLibrary {
  months: ReadingMonth[];
  bonusBooks: ReadingBook[];
}

export interface ReadingReportDraft {
  recall: string;
  coreIdea: string;
  bespokeResponse: string;
  evidenceNotes: string;
  pushBack: string;
  connection: string;
  keepOne: string;
}
