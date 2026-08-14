import { invoke } from "@tauri-apps/api/core";
import { getDatabase } from "./db";
import { setSetting } from "./settingsRepository";
import { readTextFile, writeTextFile } from "../engine/platform/nativeFiles";

const BACKUP_FORMAT = "cracked-console-community-backup";
const BACKUP_VERSION = 3;
const WEEK_MASTERY_BACKUP_VERSION = 2;
const LEGACY_BACKUP_VERSION = 1;

const tableSpecs = [
  ["user_day_state", ["day_id","status","started_at","completed_at","actual_minutes","completion_override","override_reason"]],
  ["user_block_state", ["block_id","status","started_at","completed_at","actual_minutes","note"]],
  ["user_dod_state", ["dod_item_id","is_complete","completed_at"]],
  ["learning_logs", ["day_id","learned","did","explain_without_notes","confused","next_action","created_at","updated_at"]],
  ["timers", ["block_id","state","accumulated_seconds","started_at","updated_at"]],
  ["evidence", ["id","title","description","evidence_type","day_id","week_number","location_or_url","confidence","verified","created_at"]],
  ["assessments", ["id","assessment_type","source_day_id","source_week_number","parent_assessment_id","attempt_number","max_score","score","is_independent","status","notes","created_at"]],
  ["user_week_state", ["week_id","status","started_at","proven_at","proof_assessment_id"]],
  ["assessment_errors", ["id","assessment_id","category","description","repair_required"]],
  ["assessment_evidence", ["assessment_id","evidence_id"]],
  ["repair_tasks", ["id","source_day_id","source_block_id","assessment_id","reason","priority","dependency_risk","status","scheduled_day_id","created_at","completed_at","resolution_note"]],
  ["skill_level_assignments", ["id","skill_id","level","rationale","created_at"]],
  ["skill_level_assignment_evidence", ["assignment_id","evidence_id"]],
  ["project_records", ["project_id","problem_statement","repository_reference","working_notes","started_at","completed_at"]],
  ["project_milestone_state", ["milestone_id","completed","evidence_id","note","completed_at"]],
  ["reading_book_state", ["book_id","status","started_at","completed_at"]],
  ["reading_reports", ["book_id","recall","core_idea","bespoke_response","evidence_notes","push_back","connection","keep_one","updated_at"]],
  ["practice_lesson_state", ["lesson_id","learned","practiced","reviewed","selected_explained","notes","completed_at"]],
  ["practice_logs", ["id","lesson_id","title","practice_date","goal","quantity","representative_file","best_notes","worst_notes","reflection","created_at"]],
  ["practice_preferences", ["category_id","rating","note","updated_at"]],
  ["side_path_item_state", ["item_id","status","note","started_at","completed_at"]],
  ["activity_history", ["id","event_type","entity_type","entity_id","summary","created_at"]],
  ["app_settings", ["key","value","updated_at"]],
] as const;

type BackupData = Record<string, Array<Record<string, unknown>>>;
type SqlParam = string | number | boolean | null;
interface SqlOperation { sql: string; params: SqlParam[]; }

interface BackupPayload {
  format: string;
  version: number;
  createdAt: string;
  curriculum: {
    sourceSha256: string;
    dayCount: number;
    weekCount: number;
    startDate: string;
    endDate: string;
  };
  data: BackupData;
}

export interface BackupDocument extends BackupPayload { checksumSha256: string; }
export interface BackupPreview {
  path: string;
  createdAt: string;
  rowCount: number;
  sourceSha256: string;
  checksumValid: boolean;
  document: BackupDocument;
}

function specsForVersion(version: number) {
  if (version === LEGACY_BACKUP_VERSION) {
    return tableSpecs.filter(([table]) => table !== "user_week_state" && table !== "side_path_item_state");
  }
  if (version === WEEK_MASTERY_BACKUP_VERSION) {
    return tableSpecs.filter(([table]) => table !== "side_path_item_state");
  }
  return tableSpecs;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function payloadOf(document: BackupDocument): BackupPayload {
  const { checksumSha256: _checksum, ...payload } = document;
  return payload;
}

async function currentCurriculum() {
  const db = await getDatabase();
  const rows = await db.select<Array<{ sourceSha256: string; dayCount: number; weekCount: number; startDate: string; endDate: string }>>(
    `SELECT source_sha256 AS sourceSha256, day_count AS dayCount, week_count AS weekCount,
            start_date AS startDate, end_date AS endDate
     FROM curriculum_versions LIMIT 1`,
  );
  const row = rows[0];
  if (!row) throw new Error("Plan identity is missing.");
  return row;
}

export async function createBackupDocument(): Promise<BackupDocument> {
  const db = await getDatabase();
  const data: BackupData = {};
  for (const [table] of tableSpecs) {
    data[table] = await db.select<Array<Record<string, unknown>>>(`SELECT * FROM ${table} ORDER BY rowid`);
  }
  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    curriculum: await currentCurriculum(),
    data,
  };
  return { ...payload, checksumSha256: await sha256(JSON.stringify(payload)) };
}

export async function exportBackup(path: string): Promise<BackupDocument> {
  const document = await createBackupDocument();
  await writeTextFile(path, JSON.stringify(document, null, 2));
  await setSetting("last_backup_at", document.createdAt);
  return document;
}

function validateStructure(document: BackupDocument): void {
  if (
    document.format !== BACKUP_FORMAT
    || ![LEGACY_BACKUP_VERSION, WEEK_MASTERY_BACKUP_VERSION, BACKUP_VERSION].includes(document.version)
  ) throw new Error("Unsupported backup format.");

  for (const [table] of specsForVersion(document.version)) {
    if (!Array.isArray(document.data?.[table])) throw new Error(`Backup is missing table: ${table}`);
  }
}

export async function inspectBackup(path: string): Promise<BackupPreview> {
  const raw = await readTextFile(path);
  const document = JSON.parse(raw) as BackupDocument;
  validateStructure(document);
  const expected = await sha256(JSON.stringify(payloadOf(document)));
  const checksumValid = expected === document.checksumSha256;
  const rowCount = Object.values(document.data).reduce((sum, rows) => sum + rows.length, 0);
  return { path, createdAt: document.createdAt, rowCount, sourceSha256: document.curriculum.sourceSha256, checksumValid, document };
}

export async function restoreBackup(document: BackupDocument): Promise<void> {
  validateStructure(document);
  const expected = await sha256(JSON.stringify(payloadOf(document)));
  if (expected !== document.checksumSha256) throw new Error("Backup checksum does not match.");

  const current = await currentCurriculum();
  if (
    document.curriculum.sourceSha256 !== current.sourceSha256
    || document.curriculum.dayCount !== current.dayCount
    || document.curriculum.weekCount !== current.weekCount
    || document.curriculum.startDate !== current.startDate
    || document.curriculum.endDate !== current.endDate
  ) throw new Error("Backup belongs to a different imported plan.");

  const operations: SqlOperation[] = [];
  const deleteOrder = [
    "skill_level_assignment_evidence","assessment_evidence","assessment_errors",
    "repair_tasks","project_milestone_state","skill_level_assignments",
    "side_path_item_state","user_week_state","assessments","evidence","practice_logs","activity_history","project_records",
    "reading_reports","reading_book_state","practice_lesson_state",
    "practice_preferences","timers","learning_logs","user_dod_state",
    "user_block_state","user_day_state","app_settings",
  ];
  for (const table of deleteOrder) operations.push({ sql: `DELETE FROM ${table}`, params: [] });

  for (const [table, columns] of specsForVersion(document.version)) {
    for (const row of document.data[table] ?? []) {
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(",");
      operations.push({
        sql: `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`,
        params: columns.map((column) => {
          const value = row[column];
          if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
          return value === undefined ? null : String(value);
        }),
      });
    }
  }

  const restoredAt = new Date().toISOString();
  operations.push({
    sql: `INSERT INTO app_settings (key,value,updated_at) VALUES ('last_restore_at',$1,$1)
          ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
    params: [restoredAt],
  });
  await invoke("execute_sql_transaction", { operations });
}
