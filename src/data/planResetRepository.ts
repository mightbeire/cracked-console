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

  // Old unresolved repair work belongs to the old main curriculum. Keep the
  // record, but close it before old day/block references are removed.
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

  // Main-curriculum catalogs are version-specific and are rebuilt by the next
  // import. Independent Reading and Practice/Photography tables are deliberately
  // untouched so their curriculum, logs, preferences, reports, and progress
  // survive a V2 -> V3 main-curriculum replacement.
  operation(operations, "DELETE FROM project_catalog");
  operation(operations, "DELETE FROM skills");

  // Deleting the curriculum version cascades through week/day/block execution
  // state, timers, learning logs, resources, and the V3 user_week_state table.
  operation(operations, "DELETE FROM curriculum_versions");

  operation(
    operations,
    `INSERT INTO activity_history
       (event_type, entity_type, entity_id, summary, created_at)
     VALUES ('PLAN_RESET', 'curriculum', NULL, $1, $2)`,
    [
      "Main curriculum cleared for explicit replacement. Historical evidence and proof were detached from old week/day references. Reading and Practice were preserved.",
      timestamp,
    ],
  );

  await invoke("execute_sql_transaction", { operations });
}
