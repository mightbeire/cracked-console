import { getDatabase } from "./db";
import type { EvidenceDraft, EvidenceRecord } from "../engine/domain/evidence/types";
import type { AssessmentAttempt } from "../engine/domain/assessment/types";

interface EvidenceRow {
  id: number;
  title: string;
  description: string;
  evidenceType: EvidenceRecord["evidenceType"];
  dayNumber: number | null;
  weekNumber: number | null;
  dateLabel: string | null;
  locationOrUrl: string | null;
  confidence: EvidenceRecord["confidence"];
  verified: number;
  createdAt: string;
}

interface AssessmentLinkRow {
  evidenceId: number;
  assessmentId: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function resolveDay(dayNumber: number | null): Promise<{ dayId: number | null; weekNumber: number | null }> {
  if (dayNumber === null) return { dayId: null, weekNumber: null };
  const db = await getDatabase();
  const rows = await db.select<Array<{ id: number; weekNumber: number }>>(
    `SELECT d.id, w.week_number AS weekNumber
     FROM curriculum_days d
     JOIN curriculum_weeks w ON w.id = d.week_id
     WHERE d.day_number = $1`,
    [dayNumber],
  );
  const row = rows[0];
  if (!row) throw new Error(`Day ${dayNumber} does not exist in the curriculum.`);
  return { dayId: row.id, weekNumber: row.weekNumber };
}

export async function getEvidenceRecords(): Promise<EvidenceRecord[]> {
  const db = await getDatabase();
  const rows = await db.select<EvidenceRow[]>(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.evidence_type AS evidenceType,
       d.day_number AS dayNumber,
       e.week_number AS weekNumber,
       d.date_label AS dateLabel,
       e.location_or_url AS locationOrUrl,
       e.confidence,
       e.verified,
       e.created_at AS createdAt
     FROM evidence e
     LEFT JOIN curriculum_days d ON d.id = e.day_id
     ORDER BY e.created_at DESC, e.id DESC`,
  );
  const links = await db.select<AssessmentLinkRow[]>(
    `SELECT evidence_id AS evidenceId, assessment_id AS assessmentId
     FROM assessment_evidence
     ORDER BY assessment_id`,
  );
  const assessmentIds = new Map<number, number[]>();
  for (const link of links) {
    assessmentIds.set(link.evidenceId, [...(assessmentIds.get(link.evidenceId) ?? []), link.assessmentId]);
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    evidenceType: row.evidenceType,
    dayNumber: row.dayNumber,
    weekNumber: row.weekNumber,
    dateLabel: row.dateLabel,
    locationOrUrl: row.locationOrUrl,
    confidence: row.confidence,
    verified: row.verified === 1,
    createdAt: row.createdAt,
    assessmentIds: assessmentIds.get(row.id) ?? [],
  }));
}

export async function createEvidence(draft: EvidenceDraft): Promise<number> {
  const db = await getDatabase();
  const { dayId, weekNumber } = await resolveDay(draft.dayNumber);
  const createdAt = nowIso();
  const result = await db.execute(
    `INSERT INTO evidence (
       title, description, evidence_type, day_id, week_number,
       location_or_url, confidence, verified, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      draft.title.trim(),
      draft.description.trim(),
      draft.evidenceType,
      dayId,
      weekNumber,
      draft.locationOrUrl.trim() || null,
      draft.confidence,
      draft.verified ? 1 : 0,
      createdAt,
    ],
  );
  const evidenceId = result.lastInsertId;
  if (typeof evidenceId !== "number") throw new Error("Evidence insert did not return an id.");

  if (draft.assessmentId !== null) {
    await db.execute(
      `INSERT INTO assessment_evidence (assessment_id, evidence_id)
       VALUES ($1, $2)`,
      [draft.assessmentId, evidenceId],
    );
  }

  await db.execute(
    `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('EVIDENCE_CREATED', 'evidence', $1, $2, $3)`,
    [evidenceId, draft.title.trim(), createdAt],
  );
  return evidenceId;
}

export async function getEvidenceAssessmentOptions(): Promise<Pick<AssessmentAttempt, "id" | "dayNumber" | "attemptNumber" | "score" | "maxScore" | "status">[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: number;
    dayNumber: number | null;
    attemptNumber: number;
    score: number;
    maxScore: number;
    status: AssessmentAttempt["status"];
  }>>(
    `SELECT
       a.id,
       d.day_number AS dayNumber,
       a.attempt_number AS attemptNumber,
       a.score,
       a.max_score AS maxScore,
       a.status
     FROM assessments a
     LEFT JOIN curriculum_days d ON d.id = a.source_day_id
     ORDER BY a.created_at DESC, a.id DESC`,
  );
  return rows;
}
