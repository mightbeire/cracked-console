import { getDatabase } from "./db";

export type WeekMasteryStatus = "NOT_STARTED" | "IN_PROGRESS" | "PROVEN";

export interface WeekMasterySnapshot {
  weekId: number;
  weekNumber: number;
  title: string;
  dateRangeLabel: string;
  phaseNumber: number;
  isConsolidation: boolean;
  status: WeekMasteryStatus;
  startedAt: string | null;
  provenAt: string | null;
  proofAssessmentId: number | null;
  completedDays: number;
  activeDays: number;
  passingAssessmentId: number | null;
  passingAssessmentScore: number | null;
  passingAssessmentMaxScore: number | null;
  verifiedEvidenceCount: number;
  openRepairCount: number;
  canProve: boolean;
}

interface WeekRow {
  weekId: number;
  weekNumber: number;
  title: string;
  dateRangeLabel: string;
  phaseNumber: number;
  isConsolidation: number;
  status: WeekMasteryStatus | null;
  startedAt: string | null;
  provenAt: string | null;
  proofAssessmentId: number | null;
  completedDays: number;
  activeDays: number;
}

interface PassingAssessmentRow {
  id: number;
  score: number;
  maxScore: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function getWeekRowByDay(dayNumber: number): Promise<WeekRow> {
  const db = await getDatabase();
  const rows = await db.select<WeekRow[]>(
    `SELECT
       w.id AS weekId,
       w.week_number AS weekNumber,
       w.title,
       w.date_range_label AS dateRangeLabel,
       w.phase_number AS phaseNumber,
       w.is_consolidation AS isConsolidation,
       uws.status,
       uws.started_at AS startedAt,
       uws.proven_at AS provenAt,
       uws.proof_assessment_id AS proofAssessmentId,
       SUM(CASE WHEN d.is_rest_day = 0 AND uds.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedDays,
       SUM(CASE WHEN d.is_rest_day = 0 THEN 1 ELSE 0 END) AS activeDays
     FROM curriculum_weeks w
     JOIN curriculum_days anchor ON anchor.week_id = w.id
     JOIN curriculum_days d ON d.week_id = w.id
     LEFT JOIN user_day_state uds ON uds.day_id = d.id
     LEFT JOIN user_week_state uws ON uws.week_id = w.id
     WHERE anchor.day_number = $1
     GROUP BY w.id`,
    [dayNumber],
  );
  const row = rows[0];
  if (!row) throw new Error(`No curriculum week contains Day ${dayNumber}.`);
  return row;
}

async function getPassingAssessment(weekNumber: number): Promise<PassingAssessmentRow | null> {
  const db = await getDatabase();
  const rows = await db.select<PassingAssessmentRow[]>(
    `SELECT id, score, max_score AS maxScore
     FROM assessments
     WHERE source_week_number = $1
       AND is_independent = 1
       AND status = 'PASS'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [weekNumber],
  );
  return rows[0] ?? null;
}

async function getOpenRepairCount(weekNumber: number): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(DISTINCT r.id) AS count
     FROM repair_tasks r
     LEFT JOIN assessments a ON a.id = r.assessment_id
     LEFT JOIN curriculum_days d ON d.id = r.source_day_id
     LEFT JOIN curriculum_weeks w ON w.id = d.week_id
     WHERE r.status IN ('OPEN','ACCEPTED')
       AND (a.source_week_number = $1 OR w.week_number = $1)`,
    [weekNumber],
  );
  return rows[0]?.count ?? 0;
}

async function getVerifiedEvidenceCount(weekNumber: number): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count
     FROM evidence
     WHERE week_number = $1 AND verified = 1`,
    [weekNumber],
  );
  return rows[0]?.count ?? 0;
}

export async function getWeekMasteryByDay(dayNumber: number): Promise<WeekMasterySnapshot> {
  const row = await getWeekRowByDay(dayNumber);
  const [passing, openRepairCount, verifiedEvidenceCount] = await Promise.all([
    getPassingAssessment(row.weekNumber),
    getOpenRepairCount(row.weekNumber),
    getVerifiedEvidenceCount(row.weekNumber),
  ]);

  return {
    weekId: row.weekId,
    weekNumber: row.weekNumber,
    title: row.title,
    dateRangeLabel: row.dateRangeLabel,
    phaseNumber: row.phaseNumber,
    isConsolidation: row.isConsolidation === 1,
    status: row.status ?? "NOT_STARTED",
    startedAt: row.startedAt,
    provenAt: row.provenAt,
    proofAssessmentId: row.proofAssessmentId,
    completedDays: row.completedDays ?? 0,
    activeDays: row.activeDays ?? 0,
    passingAssessmentId: passing?.id ?? null,
    passingAssessmentScore: passing?.score ?? null,
    passingAssessmentMaxScore: passing?.maxScore ?? null,
    verifiedEvidenceCount,
    openRepairCount,
    canProve: Boolean(passing) && verifiedEvidenceCount > 0 && openRepairCount === 0,
  };
}

export async function startWeek(weekId: number): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `INSERT INTO user_week_state (week_id, status, started_at)
     VALUES ($1, 'IN_PROGRESS', $2)
     ON CONFLICT(week_id) DO UPDATE SET
       status = CASE WHEN user_week_state.status = 'PROVEN' THEN 'PROVEN' ELSE 'IN_PROGRESS' END,
       started_at = COALESCE(user_week_state.started_at, excluded.started_at)`,
    [weekId, timestamp],
  );
}

export async function proveWeek(dayNumber: number): Promise<void> {
  const snapshot = await getWeekMasteryByDay(dayNumber);
  if (snapshot.status === "PROVEN") return;
  if (!snapshot.passingAssessmentId) {
    throw new Error("A week needs a passing independent assessment before it can be proven.");
  }
  if (snapshot.verifiedEvidenceCount < 1) {
    throw new Error("A week needs at least one verified evidence item before it can be proven.");
  }
  if (snapshot.openRepairCount > 0) {
    throw new Error("Resolve the week's open repair work before proving the week.");
  }

  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `INSERT INTO user_week_state
       (week_id, status, started_at, proven_at, proof_assessment_id)
     VALUES ($1, 'PROVEN', $2, $2, $3)
     ON CONFLICT(week_id) DO UPDATE SET
       status = 'PROVEN',
       started_at = COALESCE(user_week_state.started_at, excluded.started_at),
       proven_at = excluded.proven_at,
       proof_assessment_id = excluded.proof_assessment_id`,
    [snapshot.weekId, timestamp, snapshot.passingAssessmentId],
  );
  await db.execute(
    `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('WEEK_PROVEN', 'curriculum_week', $1, $2, $3)`,
    [snapshot.weekId, `Week ${snapshot.weekNumber} proven by assessment plus verified evidence.`, timestamp],
  );
}
