import { getDatabase } from "./db";
import type { EvidenceRecord } from "../engine/domain/evidence/types";
import type { ProjectMilestone, ProjectRecord } from "../engine/domain/projects/types";
import { canCompleteProject } from "../engine/domain/projects/rules";

interface ProjectRow {
  id: number;
  code: ProjectRecord["code"];
  name: string;
  coreIntegration: string;
  startDay: number;
  endDay: number;
  startDate: string;
  endDate: string;
  startDateLabel: string;
  endDateLabel: string;
  defenceAssessmentType: ProjectRecord["defenceAssessmentType"];
  problemStatement: string;
  repositoryReference: string;
  workingNotes: string;
  startedAt: string | null;
  completedAt: string | null;
  passingDefenceCount: number;
}

interface MilestoneRow {
  id: number;
  projectId: number;
  sortOrder: number;
  title: string;
  description: string;
  completed: number;
  evidenceId: number | null;
  evidenceTitle: string | null;
  note: string;
  completedAt: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function loadProjectsRaw(): Promise<ProjectRecord[]> {
  const db = await getDatabase();

  const projectRows = await db.select<ProjectRow[]>(
    `SELECT
       p.id,
       p.code,
       p.name,
       p.core_integration AS coreIntegration,
       p.start_day AS startDay,
       p.end_day AS endDay,
       sd.date AS startDate,
       ed.date AS endDate,
       sd.date_label AS startDateLabel,
       ed.date_label AS endDateLabel,
       p.defence_assessment_type AS defenceAssessmentType,
       r.problem_statement AS problemStatement,
       r.repository_reference AS repositoryReference,
       r.working_notes AS workingNotes,
       r.started_at AS startedAt,
       r.completed_at AS completedAt,
       (
         SELECT COUNT(*)
         FROM assessments a
         JOIN curriculum_days ad ON ad.id = a.source_day_id
         WHERE a.status = 'PASS'
           AND a.assessment_type = p.defence_assessment_type
           AND ad.day_number BETWEEN p.start_day AND p.end_day
       ) AS passingDefenceCount
     FROM project_catalog p
     JOIN project_records r ON r.project_id = p.id
     JOIN curriculum_days sd ON sd.day_number = p.start_day
     JOIN curriculum_days ed ON ed.day_number = p.end_day
     ORDER BY p.id`,
  );

  const milestoneRows = await db.select<MilestoneRow[]>(
    `SELECT
       m.id,
       m.project_id AS projectId,
       m.sort_order AS sortOrder,
       m.title,
       m.description,
       s.completed,
       s.evidence_id AS evidenceId,
       e.title AS evidenceTitle,
       s.note,
       s.completed_at AS completedAt
     FROM project_milestones m
     JOIN project_milestone_state s ON s.milestone_id = m.id
     LEFT JOIN evidence e ON e.id = s.evidence_id
     ORDER BY m.project_id, m.sort_order`,
  );

  const milestoneMap = new Map<number, ProjectMilestone[]>();
  for (const row of milestoneRows) {
    const milestone: ProjectMilestone = {
      id: row.id,
      sortOrder: row.sortOrder,
      title: row.title,
      description: row.description,
      completed: row.completed === 1,
      evidenceId: row.evidenceId,
      evidenceTitle: row.evidenceTitle,
      note: row.note,
      completedAt: row.completedAt,
    };
    milestoneMap.set(row.projectId, [...(milestoneMap.get(row.projectId) ?? []), milestone]);
  }

  return projectRows.map((row) => ({
    ...row,
    milestones: milestoneMap.get(row.id) ?? [],
  }));
}

async function reconcileProject(project: ProjectRecord): Promise<boolean> {
  if (project.completedAt || !canCompleteProject(project)) return false;
  const db = await getDatabase();
  const result = await db.execute(
    `UPDATE project_records
     SET completed_at = $2
     WHERE project_id = $1 AND completed_at IS NULL`,
    [project.id, nowIso()],
  );
  if (result.rowsAffected > 0) {
    await db.execute(
      `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
       VALUES ('PROJECT_COMPLETED', 'project', $1, $2, $3)`,
      [project.id, `${project.name} completed with milestone evidence and passing defence.`, nowIso()],
    );
    return true;
  }
  return false;
}

export async function reconcileAllProjects(): Promise<void> {
  const projects = await loadProjectsRaw();
  for (const project of projects) await reconcileProject(project);
}

export async function getProjects(): Promise<ProjectRecord[]> {
  await reconcileAllProjects();
  return loadProjectsRaw();
}

export async function startProject(projectId: number): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `UPDATE project_records
     SET started_at = COALESCE(started_at, $2)
     WHERE project_id = $1`,
    [projectId, timestamp],
  );
  await db.execute(
    `INSERT INTO activity_history (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('PROJECT_STARTED', 'project', $1, 'Project started.', $2)`,
    [projectId, timestamp],
  );
}

export async function saveProjectDetails(
  projectId: number,
  problemStatement: string,
  repositoryReference: string,
  workingNotes: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `UPDATE project_records
     SET problem_statement = $2,
         repository_reference = $3,
         working_notes = $4
     WHERE project_id = $1`,
    [projectId, problemStatement.trim(), repositoryReference.trim(), workingNotes.trim()],
  );
}

export async function setProjectMilestone(
  milestoneId: number,
  completed: boolean,
  evidenceId: number | null,
  note: string,
): Promise<void> {
  if (completed && evidenceId === null) {
    throw new Error("Completed project milestones require linked evidence.");
  }

  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `UPDATE project_milestone_state
     SET completed = $2,
         evidence_id = $3,
         note = $4,
         completed_at = $5
     WHERE milestone_id = $1`,
    [
      milestoneId,
      completed ? 1 : 0,
      completed ? evidenceId : null,
      note.trim(),
      completed ? timestamp : null,
    ],
  );
  await reconcileAllProjects();
}

interface ProjectEvidenceOptionRow {
  id: number;
  title: string;
  evidenceType: EvidenceRecord["evidenceType"];
  dayNumber: number | null;
  verified: number;
}

export async function getProjectEvidenceOptions(): Promise<Pick<EvidenceRecord, "id" | "title" | "evidenceType" | "dayNumber" | "verified">[]> {
  const db = await getDatabase();
  const rows = await db.select<ProjectEvidenceOptionRow[]>(
    `SELECT
       e.id,
       e.title,
       e.evidence_type AS evidenceType,
       d.day_number AS dayNumber,
       e.verified
     FROM evidence e
     LEFT JOIN curriculum_days d ON d.id = e.day_id
     ORDER BY e.created_at DESC, e.id DESC`,
  );
  return rows.map((row) => ({ ...row, verified: row.verified === 1 }));
}
