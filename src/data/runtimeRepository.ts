import { getDatabase } from "./db";
import { getPlanIdentity } from "./planMetaRepository";

async function count(sql: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ count: number }>>(sql);
  return rows[0]?.count ?? 0;
}

async function ensureMutableScaffolding(): Promise<void> {
  const db = await getDatabase();

  await db.execute(
    `INSERT OR IGNORE INTO project_records
     (project_id,problem_statement,repository_reference,working_notes)
     SELECT id,'','','' FROM project_catalog`,
  );
  await db.execute(
    `INSERT OR IGNORE INTO project_milestone_state
     (milestone_id,completed,evidence_id,note,completed_at)
     SELECT id,0,NULL,'',NULL FROM project_milestones`,
  );
  await db.execute(
    `INSERT OR IGNORE INTO reading_book_state
     (book_id,status,started_at,completed_at)
     SELECT id,'NOT_STARTED',NULL,NULL FROM reading_books`,
  );
  await db.execute(
    `INSERT OR IGNORE INTO reading_reports
     (book_id,recall,core_idea,bespoke_response,evidence_notes,push_back,connection,keep_one,updated_at)
     SELECT id,'','','','','','','',NULL FROM reading_books`,
  );
  await db.execute(
    `INSERT OR IGNORE INTO practice_lesson_state
     (lesson_id,learned,practiced,reviewed,selected_explained,notes,completed_at)
     SELECT id,0,0,0,0,'',NULL FROM practice_lessons`,
  );
  await db.execute(
    `INSERT OR IGNORE INTO practice_preferences
     (category_id,rating,note,updated_at)
     SELECT id,NULL,'',NULL FROM practice_categories`,
  );
}

async function recoverRunningTimers(): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE timers
     SET state='PAUSED',started_at=NULL,updated_at=$1
     WHERE state='RUNNING'`,
    [now],
  );
  await db.execute(
    `INSERT INTO runtime_meta (key,value,updated_at)
     VALUES ('last_timer_recovery_at',$1,$1)
     ON CONFLICT(key) DO UPDATE
     SET value=excluded.value,updated_at=excluded.updated_at`,
    [now],
  );
}

export async function initializeRuntime(): Promise<void> {
  const identity = await getPlanIdentity();
  const db = await getDatabase();

  const [versions, weeks, days] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM curriculum_versions"),
    count("SELECT COUNT(*) AS count FROM curriculum_weeks"),
    count("SELECT COUNT(*) AS count FROM curriculum_days"),
  ]);

  const rows = await db.select<Array<{
    firstDate: string | null;
    lastDate: string | null;
    maxDay: number | null;
  }>>(
    `SELECT
       MIN(date) AS firstDate,
       MAX(date) AS lastDate,
       MAX(day_number) AS maxDay
     FROM curriculum_days`,
  );
  const range = rows[0];

  if (
    versions !== 1
    || weeks !== identity.weekCount
    || days !== identity.dayCount
    || range?.firstDate !== identity.startDate
    || range?.lastDate !== identity.endDate
    || range?.maxDay !== identity.dayCount
  ) {
    throw new Error(
      "The imported plan identity does not match the local curriculum tables.",
    );
  }

  await ensureMutableScaffolding();
  await recoverRunningTimers();

  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO runtime_meta (key,value,updated_at)
     VALUES ('last_clean_boot_at',$1,$1)
     ON CONFLICT(key) DO UPDATE
     SET value=excluded.value,updated_at=excluded.updated_at`,
    [now],
  );
}
