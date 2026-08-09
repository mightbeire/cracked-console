import { getDatabase } from "./db";
import {
  inferAssessmentType,
  isAssessmentHeading,
  determineAssessmentStatus,
} from "../engine/domain/assessment/rules";
import type {
  AssessmentAttempt,
  AssessmentDraft,
  AssessmentErrorCategory,
  RepairTask,
  ScheduledProof,
} from "../engine/domain/assessment/types";

interface ProofCandidateRow {
  dayId: number;
  dayNumber: number;
  weekNumber: number;
  dateLabel: string;
  blockId: number;
  blockLabel: string;
  blockType: string;
  instructionsMarkdown: string;
}

interface AttemptRow {
  id: number;
  assessmentType: AssessmentAttempt["assessmentType"];
  dayNumber: number | null;
  weekNumber: number | null;
  dateLabel: string | null;
  attemptNumber: number;
  score: number;
  maxScore: number;
  isIndependent: number;
  status: AssessmentAttempt["status"];
  notes: string;
  parentAssessmentId: number | null;
  createdAt: string;
}

interface ErrorRow {
  assessmentId: number;
  category: AssessmentErrorCategory;
}

interface RepairRow {
  id: number;
  assessmentId: number | null;
  sourceDayId: number | null;
  dayNumber: number | null;
  reason: string;
  priority: RepairTask["priority"];
  dependencyRisk: RepairTask["dependencyRisk"];
  status: RepairTask["status"];
  createdAt: string;
  completedAt: string | null;
  resolutionNote: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function headingFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/^#{1,4}\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

export async function getProofSchedule(): Promise<ScheduledProof[]> {
  const db = await getDatabase();
  const rows = await db.select<ProofCandidateRow[]>(
    `SELECT
       d.id AS dayId,
       d.day_number AS dayNumber,
       w.week_number AS weekNumber,
       d.date_label AS dateLabel,
       b.id AS blockId,
       b.label AS blockLabel,
       b.block_type AS blockType,
       b.instructions_markdown AS instructionsMarkdown
     FROM curriculum_blocks b
     JOIN curriculum_days d ON d.id = b.day_id
     JOIN curriculum_weeks w ON w.id = d.week_id
     WHERE d.is_rest_day = 0
       AND (
         upper(b.instructions_markdown) LIKE '%PROOF%'
         OR upper(b.instructions_markdown) LIKE '%EXAM%'
         OR upper(b.instructions_markdown) LIKE '%DEFENCE%'
         OR upper(b.instructions_markdown) LIKE '%CHECK%'
       )
     ORDER BY d.day_number, b.sort_order`,
  );

  const seen = new Set<string>();
  const proofs: ScheduledProof[] = [];
  for (const row of rows) {
    const title = headingFromMarkdown(row.instructionsMarkdown) ?? row.blockLabel;
    const assessmentText = `${row.blockType} ${row.blockLabel} ${row.instructionsMarkdown}`;
    if (!isAssessmentHeading(assessmentText)) continue;
    const key = `${row.dayNumber}:${row.blockId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    proofs.push({
      key,
      dayId: row.dayId,
      dayNumber: row.dayNumber,
      weekNumber: row.weekNumber,
      dateLabel: row.dateLabel,
      blockId: row.blockId,
      title,
      assessmentType: inferAssessmentType(`${row.blockType} ${title}`),
      instructionsMarkdown: row.instructionsMarkdown,
    });
  }
  return proofs;
}

export async function getAssessmentHistory(): Promise<AssessmentAttempt[]> {
  const db = await getDatabase();
  const attempts = await db.select<AttemptRow[]>(
    `SELECT
       a.id,
       a.assessment_type AS assessmentType,
       d.day_number AS dayNumber,
       a.source_week_number AS weekNumber,
       d.date_label AS dateLabel,
       a.attempt_number AS attemptNumber,
       a.score,
       a.max_score AS maxScore,
       a.is_independent AS isIndependent,
       a.status,
       a.notes,
       a.parent_assessment_id AS parentAssessmentId,
       a.created_at AS createdAt
     FROM assessments a
     LEFT JOIN curriculum_days d ON d.id = a.source_day_id
     ORDER BY a.created_at DESC, a.id DESC`,
  );

  const errorRows = await db.select<ErrorRow[]>(
    `SELECT assessment_id AS assessmentId, category
     FROM assessment_errors
     ORDER BY id`,
  );
  const errors = new Map<number, AssessmentErrorCategory[]>();
  for (const row of errorRows) {
    errors.set(row.assessmentId, [...(errors.get(row.assessmentId) ?? []), row.category]);
  }

  return attempts.map((row) => ({
    id: row.id,
    assessmentType: row.assessmentType,
    dayNumber: row.dayNumber,
    weekNumber: row.weekNumber,
    dateLabel: row.dateLabel,
    attemptNumber: row.attemptNumber,
    score: row.score,
    maxScore: row.maxScore,
    independent: row.isIndependent === 1,
    status: row.status,
    notes: row.notes,
    parentAssessmentId: row.parentAssessmentId,
    createdAt: row.createdAt,
    errorCategories: errors.get(row.id) ?? [],
  }));
}

export async function getOpenRepairTasks(): Promise<RepairTask[]> {
  const db = await getDatabase();
  const rows = await db.select<RepairRow[]>(
    `SELECT
       r.id,
       r.assessment_id AS assessmentId,
       r.source_day_id AS sourceDayId,
       d.day_number AS dayNumber,
       r.reason,
       r.priority,
       r.dependency_risk AS dependencyRisk,
       r.status,
       r.created_at AS createdAt,
       r.completed_at AS completedAt,
       r.resolution_note AS resolutionNote
     FROM repair_tasks r
     LEFT JOIN curriculum_days d ON d.id = r.source_day_id
     WHERE r.status IN ('OPEN', 'ACCEPTED')
     ORDER BY
       CASE r.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
       r.created_at`,
  );
  return rows;
}

async function nextAttemptNumber(sourceDayId: number | null): Promise<number> {
  const db = await getDatabase();
  if (sourceDayId === null) return 1;
  const rows = await db.select<Array<{ nextAttempt: number }>>(
    `SELECT COALESCE(MAX(attempt_number), 0) + 1 AS nextAttempt
     FROM assessments
     WHERE source_day_id = $1`,
    [sourceDayId],
  );
  return rows[0]?.nextAttempt ?? 1;
}

async function addActivity(eventType: string, entityType: string, entityId: number | null, summary: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [eventType, entityType, entityId, summary, nowIso()],
  );
}

export async function createAssessmentAttempt(draft: AssessmentDraft): Promise<number> {
  const db = await getDatabase();
  const attemptNumber = await nextAttemptNumber(draft.sourceDayId);
  const status = determineAssessmentStatus(draft.score, draft.maxScore);
  const createdAt = nowIso();

  const result = await db.execute(
    `INSERT INTO assessments (
       assessment_type, source_day_id, source_week_number, parent_assessment_id,
       attempt_number, score, max_score, is_independent, status, notes, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      draft.assessmentType,
      draft.sourceDayId,
      draft.sourceWeekNumber,
      draft.parentAssessmentId ?? null,
      attemptNumber,
      draft.score,
      draft.maxScore,
      draft.independent ? 1 : 0,
      status,
      draft.notes.trim(),
      createdAt,
    ],
  );
  const assessmentId = result.lastInsertId;
  if (typeof assessmentId !== "number") throw new Error("Assessment insert did not return an id.");

  for (const category of draft.errorCategories) {
    await db.execute(
      `INSERT INTO assessment_errors (assessment_id, category, description, repair_required)
       VALUES ($1, $2, '', $3)`,
      [assessmentId, category, status === "REPAIR_REQUIRED" ? 1 : 0],
    );
  }

  if (draft.repairTaskId && status === "PASS") {
    await db.execute(
      `UPDATE repair_tasks
       SET status = 'RESOLVED', completed_at = $2, resolution_note = 'Fresh retest passed.'
       WHERE id = $1`,
      [draft.repairTaskId, createdAt],
    );
    await addActivity("REPAIR_RESOLVED", "repair_task", draft.repairTaskId, "Repair resolved by a passing fresh retest.");
  } else if (!draft.repairTaskId && status === "REPAIR_REQUIRED") {
    const repairResult = await db.execute(
      `INSERT INTO repair_tasks (
         source_day_id, assessment_id, reason, priority, dependency_risk, status, created_at
       ) VALUES ($1, $2, $3, 'P1', 'MEDIUM', 'OPEN', $4)`,
      [
        draft.sourceDayId,
        assessmentId,
        `Assessment scored ${draft.score}/${draft.maxScore}. Repair and take a fresh variant.`,
        createdAt,
      ],
    );
    const repairId = repairResult.lastInsertId;
    await addActivity("REPAIR_CREATED", "repair_task", typeof repairId === "number" ? repairId : null, "Assessment repair task created.");
  }

  await addActivity(
    "ASSESSMENT_RECORDED",
    "assessment",
    assessmentId,
    `Attempt ${attemptNumber} recorded as ${status}.`,
  );
  return assessmentId;
}

export async function resolveRepairTaskManually(repairTaskId: number): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `UPDATE repair_tasks
     SET status = 'RESOLVED', completed_at = $2, resolution_note = 'Resolved manually through equivalent evidence.'
     WHERE id = $1 AND status IN ('OPEN', 'ACCEPTED')`,
    [repairTaskId, timestamp],
  );
  await addActivity("REPAIR_RESOLVED", "repair_task", repairTaskId, "Repair marked resolved through equivalent evidence.");
}
