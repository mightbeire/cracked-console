import { getDatabase } from "./db";
import { reconcileAllProjects } from "./projectRepository";
import { validateSkillLevel } from "../engine/domain/skills/rules";
import type {
  SkillAssignmentDraft,
  SkillEvidenceSignal,
  SkillFamily,
  SkillLevel,
  SkillRecord,
} from "../engine/domain/skills/types";

interface SkillRow {
  id: number;
  code: string;
  name: string;
  family: SkillFamily;
  sortOrder: number;
  level: number | null;
  rationale: string | null;
  assignedAt: string | null;
  assignmentEvidenceCount: number;
}

interface EvidenceSignalRow {
  id: number;
  title: string;
  verified: number;
  weekNumber: number | null;
  hasPassingAssessment: number;
  hasStrongAssessment: number;
  hasCompletedProject: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getSkills(): Promise<SkillRecord[]> {
  const db = await getDatabase();
  const rows = await db.select<SkillRow[]>(
    `SELECT
       s.id,
       s.code,
       s.name,
       s.family,
       s.sort_order AS sortOrder,
       a.level,
       a.rationale,
       a.created_at AS assignedAt,
       (
         SELECT COUNT(*)
         FROM skill_level_assignment_evidence sae
         WHERE sae.assignment_id = a.id
       ) AS assignmentEvidenceCount
     FROM skills s
     LEFT JOIN skill_level_assignments a
       ON a.id = (
         SELECT a2.id
         FROM skill_level_assignments a2
         WHERE a2.skill_id = s.id
         ORDER BY a2.created_at DESC, a2.id DESC
         LIMIT 1
       )
     ORDER BY s.sort_order`,
  );

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    family: row.family,
    sortOrder: row.sortOrder,
    level: (row.level ?? 0) as SkillLevel,
    rationale: row.rationale ?? "",
    assignedAt: row.assignedAt,
    assignmentEvidenceCount: row.assignmentEvidenceCount,
  }));
}

export async function getSkillEvidenceSignals(): Promise<SkillEvidenceSignal[]> {
  await reconcileAllProjects();
  const db = await getDatabase();
  const rows = await db.select<EvidenceSignalRow[]>(
    `SELECT
       e.id,
       e.title,
       e.verified,
       e.week_number AS weekNumber,
       CASE WHEN EXISTS (
         SELECT 1
         FROM assessment_evidence ae
         JOIN assessments a ON a.id = ae.assessment_id
         WHERE ae.evidence_id = e.id
           AND a.status = 'PASS'
       ) THEN 1 ELSE 0 END AS hasPassingAssessment,
       CASE WHEN EXISTS (
         SELECT 1
         FROM assessment_evidence ae
         JOIN assessments a ON a.id = ae.assessment_id
         WHERE ae.evidence_id = e.id
           AND a.status = 'PASS'
           AND a.assessment_type IN (
             'PROJECT_DEFENCE',
             'CAPSTONE_DEFENCE',
             'DELAYED_RETENTION',
             'FINAL_EXAM',
             'LANGUAGE_FINAL',
             'COGNITIVE_FINAL'
           )
       ) THEN 1 ELSE 0 END AS hasStrongAssessment,
       CASE WHEN EXISTS (
         SELECT 1
         FROM project_milestone_state pms
         JOIN project_milestones pm ON pm.id = pms.milestone_id
         JOIN project_records pr ON pr.project_id = pm.project_id
         WHERE pms.evidence_id = e.id
           AND pr.completed_at IS NOT NULL
       ) THEN 1 ELSE 0 END AS hasCompletedProject
     FROM evidence e
     ORDER BY e.created_at DESC, e.id DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    verified: row.verified === 1,
    weekNumber: row.weekNumber,
    hasPassingAssessment: row.hasPassingAssessment === 1,
    hasStrongAssessment: row.hasStrongAssessment === 1,
    hasCompletedProject: row.hasCompletedProject === 1,
  }));
}

export async function assignSkillLevel(draft: SkillAssignmentDraft): Promise<number> {
  const db = await getDatabase();
  const allSignals = await getSkillEvidenceSignals();
  const selected = allSignals.filter((item) => draft.evidenceIds.includes(item.id));
  const validation = validateSkillLevel(draft.level, selected, draft.rationale);
  if (!validation.valid) {
    throw new Error(validation.reasons.join(" "));
  }

  const timestamp = nowIso();
  const result = await db.execute(
    `INSERT INTO skill_level_assignments (skill_id, level, rationale, created_at)
     VALUES ($1, $2, $3, $4)`,
    [draft.skillId, draft.level, draft.rationale.trim(), timestamp],
  );
  const assignmentId = result.lastInsertId;
  if (typeof assignmentId !== "number") throw new Error("Skill level assignment did not return an id.");

  for (const evidenceId of draft.evidenceIds) {
    await db.execute(
      `INSERT INTO skill_level_assignment_evidence (assignment_id, evidence_id)
       VALUES ($1, $2)`,
      [assignmentId, evidenceId],
    );
  }

  await db.execute(
    `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('SKILL_LEVEL_ASSIGNED', 'skill', $1, $2, $3)`,
    [draft.skillId, `Skill level assigned: L${draft.level}.`, timestamp],
  );

  return assignmentId;
}

export async function getSkillAssignmentHistory(skillId: number): Promise<Array<{
  id: number;
  level: SkillLevel;
  rationale: string;
  createdAt: string;
  evidenceCount: number;
}>> {
  const db = await getDatabase();
  return db.select<Array<{
    id: number;
    level: SkillLevel;
    rationale: string;
    createdAt: string;
    evidenceCount: number;
  }>>(
    `SELECT
       a.id,
       a.level,
       a.rationale,
       a.created_at AS createdAt,
       (SELECT COUNT(*) FROM skill_level_assignment_evidence sae WHERE sae.assignment_id = a.id) AS evidenceCount
     FROM skill_level_assignments a
     WHERE a.skill_id = $1
     ORDER BY a.created_at DESC, a.id DESC`,
    [skillId],
  );
}
