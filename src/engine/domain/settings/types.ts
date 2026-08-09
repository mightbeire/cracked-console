import type { AppSection } from "../../../app/navigation";

export interface AppSettings {
  startupSection: AppSection;
  backupReminderDays: 0 | 7 | 14 | 30;
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
}

export interface DataHealth {
  integrity: "ok" | "error";
  foreignKeyIssues: number;
  curriculumDays: number;
  curriculumWeeks: number;
  sourceSha256: string;
  mutableRowCount: number;
}
