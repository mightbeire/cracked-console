import { getDatabase } from "./db";
import type {
  ProgressActivity,
  ProgressSnapshot,
  SkillLevelCount,
} from "../engine/domain/progress/types";

export async function getProgressSnapshot(
  currentDayNumber: number | null,
): Promise<ProgressSnapshot> {
  const db = await getDatabase();
  const dayLimit = currentDayNumber ?? 0;

  const rows = await db.select<Array<Omit<
    ProgressSnapshot,
    "skillLevels" | "recentActivity"
  >>>(
    `SELECT
      (SELECT COUNT(*) FROM curriculum_days WHERE is_rest_day=0) AS totalActiveDays,
      (SELECT COUNT(*) FROM curriculum_days WHERE is_rest_day=0 AND day_number <= $1) AS elapsedActiveDays,
      (SELECT COUNT(*) FROM user_day_state uds JOIN curriculum_days d ON d.id=uds.day_id WHERE d.is_rest_day=0 AND uds.status='COMPLETED') AS completedActiveDays,
      (SELECT COUNT(*) FROM user_block_state ubs JOIN curriculum_blocks b ON b.id=ubs.block_id WHERE b.is_required=1 AND ubs.status='COMPLETE') AS completedRequiredBlocks,
      (SELECT COUNT(*) FROM curriculum_blocks b JOIN curriculum_days d ON d.id=b.day_id WHERE b.is_required=1 AND d.is_rest_day=0 AND d.day_number <= $1) AS elapsedRequiredBlocks,
      (SELECT COALESCE(SUM(actual_minutes),0) FROM user_block_state WHERE status='COMPLETE') AS trackedMinutes,
      (SELECT COUNT(*) FROM assessments) AS assessmentAttempts,
      (SELECT COUNT(*) FROM assessments WHERE status='PASS') AS passingAttempts,
      (SELECT COUNT(*) FROM repair_tasks WHERE status IN ('OPEN','ACCEPTED')) AS openRepairs,
      (SELECT COUNT(*) FROM evidence) AS evidenceCount,
      (SELECT COUNT(*) FROM evidence WHERE verified=1) AS verifiedEvidenceCount,
      (SELECT COUNT(*) FROM project_records WHERE completed_at IS NOT NULL) AS projectsCompleted,
      (SELECT COUNT(*) FROM project_catalog) AS totalProjects,
      (SELECT COUNT(*) FROM reading_book_state s JOIN reading_books b ON b.id=s.book_id WHERE b.is_bonus=0 AND s.status='COMPLETE') AS readingComplete,
      (SELECT COUNT(*) FROM reading_books WHERE is_bonus=0) AS readingTotal,
      (SELECT COUNT(*) FROM practice_lesson_state WHERE completed_at IS NOT NULL) AS practiceLessonsComplete,
      (SELECT COUNT(*) FROM practice_lessons) AS practiceLessonsTotal,
      (SELECT COUNT(*) FROM skills) AS totalSkills`,
    [dayLimit],
  );

  const base = rows[0];
  if (!base) throw new Error("Progress query returned no row.");

  const skillRows = await db.select<Array<{ level: number; count: number }>>(
    `WITH latest AS (
       SELECT s.id,
              COALESCE((
                SELECT a.level
                FROM skill_level_assignments a
                WHERE a.skill_id=s.id
                ORDER BY a.created_at DESC,a.id DESC
                LIMIT 1
              ),0) AS level
       FROM skills s
     )
     SELECT level,COUNT(*) AS count
     FROM latest
     GROUP BY level
     ORDER BY level`,
  );

  const levelMap = new Map(skillRows.map((row) => [row.level, row.count]));
  const skillLevels: SkillLevelCount[] = ([0,1,2,3,4] as const).map((level) => ({
    level,
    count: levelMap.get(level) ?? 0,
  }));

  const recentActivity = await db.select<ProgressActivity[]>(
    `SELECT id,event_type AS eventType,summary,created_at AS createdAt
     FROM activity_history
     ORDER BY created_at DESC,id DESC
     LIMIT 12`,
  );

  return { ...base, skillLevels, recentActivity };
}
