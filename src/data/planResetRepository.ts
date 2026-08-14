import { invoke } from "@tauri-apps/api/core";

interface SqlOperation {
  sql: string;
  params: Array<string | number | boolean | null>;
}

function operation(
  operations: SqlOperation[],
  sql: string,
  params: SqlOperation["params"] = [],
): void {
  operations.push({ sql, params });
}

export async function resetImportedPlanForReplacement(): Promise<void> {
  const timestamp = new Date().toISOString();
  const operations: SqlOperation[] = [];

  // Historical proof and evidence remain in the local database, but they must
  // not be allowed to satisfy a future plan that reuses the same week numbers.
  operation(
    operations,
    "UPDATE assessments SET source_day_id = NULL, source_week_number = NULL",
  );
  operation(
    operations,
    "UPDATE evidence SET day_id = NULL, week_number = NULL",
  );

  // Old unresolved repair work belongs to the old curriculum. Keep the record,
  // but close it before the old day/block references are removed.
  operation(
    operations,
    `UPDATE repair_tasks
     SET status = 'DISMISSED',
         completed_at = $1,
         resolution_note = CASE
           WHEN length(trim(COALESCE(resolution_note, ''))) > 0 THEN resolution_note
           ELSE 'Closed during explicit plan replacement.'
         END
     WHERE status IN ('OPEN','ACCEPTED')`,
    [timestamp],
  );

  // Catalog-backed state must be rebuilt from the next imported plan.
  operation(operations, "DELETE FROM project_catalog");
  operation(operations, "DELETE FROM skills");

  operation(operations, "DELETE FROM reading_books");
  operation(operations, "DELETE FROM reading_months");

  // Remove self-references before deleting practice stages. Practice logs are
  // preserved; their lesson_id becomes NULL through the existing foreign key.
  operation(operations, "UPDATE practice_stages SET unlock_after_stage_id = NULL");
  operation(operations, "DELETE FROM practice_challenges");
  operation(operations, "DELETE FROM practice_preferences");
  operation(operations, "DELETE FROM practice_categories");
  operation(operations, "DELETE FROM practice_stages");

  // Deleting the curriculum version cascades through week/day/block execution
  // state, timers, learning logs, resources, and the V3 user_week_state table.
  operation(operations, "DELETE FROM curriculum_versions");

  operation(
    operations,
    `INSERT INTO activity_history
       (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('PLAN_RESET', 'curriculum', NULL, $1, $2)`,
    [
      "Imported plan cleared for an explicit replacement. Historical evidence and proof were detached from old week/day references.",
      timestamp,
    ],
  );

  await invoke("execute_sql_transaction", { operations });
}
