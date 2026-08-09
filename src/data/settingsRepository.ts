import { getDatabase } from "./db";
import type { AppSection } from "../app/navigation";
import type {
  AppSettings,
  DataHealth,
} from "../engine/domain/settings/types";

const allowedStartupSections = new Set<AppSection>([
  "today","curriculum","proof","projects","skills","evidence",
  "reading","practice","guide","progress","settings",
]);

function nowIso(): string {
  return new Date().toISOString();
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ key: string; value: string }>>(
    "SELECT key,value FROM app_settings",
  );
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const startup = map.get("startup_section") as AppSection | undefined;
  const reminder = Number(map.get("backup_reminder_days") ?? "14");

  return {
    startupSection: startup && allowedStartupSections.has(startup) ? startup : "today",
    backupReminderDays: ([0,7,14,30] as const).includes(reminder as 0|7|14|30)
      ? reminder as 0|7|14|30
      : 14,
    lastBackupAt: map.get("last_backup_at") || null,
    lastRestoreAt: map.get("last_restore_at") || null,
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const allowed = new Set([
    "startup_section","backup_reminder_days","last_backup_at","last_restore_at",
  ]);
  if (!allowed.has(key)) throw new Error("Unknown setting.");

  const db = await getDatabase();
  await db.execute(
    `INSERT INTO app_settings (key,value,updated_at)
     VALUES ($1,$2,$3)
     ON CONFLICT(key) DO UPDATE
     SET value=excluded.value,updated_at=excluded.updated_at`,
    [key, value, nowIso()],
  );
}

export async function getStartupSection(): Promise<AppSection> {
  return (await getAppSettings()).startupSection;
}

export async function runDataHealthCheck(): Promise<DataHealth> {
  const db = await getDatabase();
  const integrity = await db.select<Array<{ integrity_check: string }>>(
    "PRAGMA integrity_check",
  );
  const foreignKeys = await db.select<Record<string, unknown>[]>(
    "PRAGMA foreign_key_check",
  );
  const days = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM curriculum_days",
  );
  const weeks = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM curriculum_weeks",
  );
  const version = await db.select<Array<{ sourceSha256: string }>>(
    "SELECT source_sha256 AS sourceSha256 FROM curriculum_versions LIMIT 1",
  );

  const mutableTables = [
    "user_day_state","user_block_state","user_dod_state","learning_logs","timers",
    "assessments","assessment_errors","evidence","assessment_evidence","repair_tasks",
    "activity_history","skill_level_assignments","skill_level_assignment_evidence",
    "project_records","project_milestone_state","reading_book_state","reading_reports",
    "practice_lesson_state","practice_logs","practice_preferences","app_settings",
  ];

  let mutableRowCount = 0;
  for (const table of mutableTables) {
    const rows = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    mutableRowCount += rows[0]?.count ?? 0;
  }

  return {
    integrity: integrity[0]?.integrity_check === "ok" ? "ok" : "error",
    foreignKeyIssues: foreignKeys.length,
    curriculumDays: days[0]?.count ?? 0,
    curriculumWeeks: weeks[0]?.count ?? 0,
    sourceSha256: version[0]?.sourceSha256 ?? "",
    mutableRowCount,
  };
}
