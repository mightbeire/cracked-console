import type { ReadingReportDraft, ReadingStatus } from "./types";

export function readingReportComplete(report: ReadingReportDraft): boolean {
  return [
    report.recall,
    report.coreIdea,
    report.bespokeResponse,
    report.evidenceNotes,
    report.pushBack,
    report.connection,
    report.keepOne,
  ].every((value) => value.trim().length > 0);
}

export function nextReadingStatus(current: ReadingStatus): ReadingStatus {
  if (current === "NOT_STARTED") return "READING";
  if (current === "READING") return "REPORT_DUE";
  if (current === "REPORT_DUE") return "COMPLETE";
  return "COMPLETE";
}
