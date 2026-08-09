import { getDatabase } from "./db";
import { readingReportComplete } from "../engine/domain/reading/rules";
import type {
  ReadingBook,
  ReadingLibrary,
  ReadingMonth,
  ReadingReportDraft,
  ReadingStatus,
} from "../engine/domain/reading/types";

interface BookRow {
  id: number;
  monthId: number | null;
  slot: number;
  title: string;
  author: string;
  isShort: number;
  isBonus: number;
  isReread: number;
  bespokeAssignment: string;
  status: ReadingStatus;
  startedAt: string | null;
  completedAt: string | null;
  recall: string;
  coreIdea: string;
  bespokeResponse: string;
  evidenceNotes: string;
  pushBack: string;
  connection: string;
  keepOne: string;
  updatedAt: string | null;
}

interface MonthRow {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  requiredCount: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapBook(row: BookRow): ReadingBook {
  return {
    id: row.id,
    monthId: row.monthId,
    slot: row.slot,
    title: row.title,
    author: row.author,
    isShort: row.isShort === 1,
    isBonus: row.isBonus === 1,
    isReread: row.isReread === 1,
    bespokeAssignment: row.bespokeAssignment,
    status: row.status,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    report: {
      recall: row.recall,
      coreIdea: row.coreIdea,
      bespokeResponse: row.bespokeResponse,
      evidenceNotes: row.evidenceNotes,
      pushBack: row.pushBack,
      connection: row.connection,
      keepOne: row.keepOne,
      updatedAt: row.updatedAt,
    },
  };
}

export async function getReadingLibrary(): Promise<ReadingLibrary> {
  const db = await getDatabase();
  const months = await db.select<MonthRow[]>(
    `SELECT
       id,
       title,
       start_date AS startDate,
       end_date AS endDate,
       required_count AS requiredCount
     FROM reading_months
     ORDER BY id`,
  );

  const rows = await db.select<BookRow[]>(
    `SELECT
       b.id,
       b.month_id AS monthId,
       b.slot,
       b.title,
       b.author,
       b.is_short AS isShort,
       b.is_bonus AS isBonus,
       b.is_reread AS isReread,
       b.bespoke_assignment AS bespokeAssignment,
       s.status,
       s.started_at AS startedAt,
       s.completed_at AS completedAt,
       r.recall,
       r.core_idea AS coreIdea,
       r.bespoke_response AS bespokeResponse,
       r.evidence_notes AS evidenceNotes,
       r.push_back AS pushBack,
       r.connection,
       r.keep_one AS keepOne,
       r.updated_at AS updatedAt
     FROM reading_books b
     JOIN reading_book_state s ON s.book_id = b.id
     JOIN reading_reports r ON r.book_id = b.id
     ORDER BY COALESCE(b.month_id, 99), b.slot`,
  );

  const books = rows.map(mapBook);
  const mappedMonths: ReadingMonth[] = months.map((month) => ({
    ...month,
    books: books.filter((book) => book.monthId === month.id),
  }));

  return {
    months: mappedMonths,
    bonusBooks: books.filter((book) => book.isBonus),
  };
}

export async function saveReadingReport(bookId: number, draft: ReadingReportDraft): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE reading_reports
     SET recall = $2,
         core_idea = $3,
         bespoke_response = $4,
         evidence_notes = $5,
         push_back = $6,
         connection = $7,
         keep_one = $8,
         updated_at = $9
     WHERE book_id = $1`,
    [
      bookId,
      draft.recall.trim(),
      draft.coreIdea.trim(),
      draft.bespokeResponse.trim(),
      draft.evidenceNotes.trim(),
      draft.pushBack.trim(),
      draft.connection.trim(),
      draft.keepOne.trim(),
      nowIso(),
    ],
  );
}

export async function setReadingStatus(
  bookId: number,
  currentStatus: ReadingStatus,
  nextStatus: ReadingStatus,
  report: ReadingReportDraft,
): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();

  if (nextStatus === "COMPLETE" && !readingReportComplete(report)) {
    throw new Error("Complete the full seven-part Reading Brief before finishing this book.");
  }

  if (currentStatus === "NOT_STARTED" && nextStatus === "READING") {
    await db.execute(
      `UPDATE reading_book_state
       SET status = 'READING', started_at = $2, completed_at = NULL
       WHERE book_id = $1`,
      [bookId, timestamp],
    );
    return;
  }

  if (nextStatus === "REPORT_DUE") {
    await db.execute(
      `UPDATE reading_book_state
       SET status = 'REPORT_DUE',
           started_at = COALESCE(started_at, $2),
           completed_at = NULL
       WHERE book_id = $1`,
      [bookId, timestamp],
    );
    return;
  }

  if (nextStatus === "COMPLETE") {
    await saveReadingReport(bookId, report);
    await db.execute(
      `UPDATE reading_book_state
       SET status = 'COMPLETE',
           started_at = COALESCE(started_at, $2),
           completed_at = $2
       WHERE book_id = $1`,
      [bookId, timestamp],
    );
    return;
  }

  throw new Error("Unsupported reading status transition.");
}
