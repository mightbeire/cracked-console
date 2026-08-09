import { getDatabase } from "./db";
import type {
  BlockStatus,
  LearningLogDraft,
  TimerState,
  TodayBlock,
  TodayDay,
  TodayDodItem,
} from "../engine/domain/execution/types";

interface DayRow {
  id: number;
  dayNumber: number;
  date: string;
  dateLabel: string;
  weekNumber: number;
  phaseNumber: number;
  isRestDay: number;
  userStatus: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface BlockRow {
  id: number;
  blockType: TodayBlock["type"];
  label: string;
  sortOrder: number;
  plannedMinutes: number;
  instructionsMarkdown: string;
  isRequired: number;
  userStatus: string | null;
  actualMinutes: number | null;
  note: string | null;
  timerState: TimerState | null;
  accumulatedSeconds: number | null;
  timerStartedAt: string | null;
}

interface DodRow {
  id: number;
  sortOrder: number;
  text: string;
  isRequired: number;
  isComplete: number | null;
}

interface LearningLogRow {
  learned: string;
  did: string;
  explainWithoutNotes: string;
  confused: string;
  nextAction: string;
}

const emptyLog: LearningLogDraft = {
  learned: "",
  did: "",
  explainWithoutNotes: "",
  confused: "",
  nextAction: "",
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function getTodayDay(dayNumber: number): Promise<TodayDay> {
  const db = await getDatabase();
  const dayRows = await db.select<DayRow[]>(
    `SELECT
       d.id,
       d.day_number AS dayNumber,
       d.date,
       d.date_label AS dateLabel,
       w.week_number AS weekNumber,
       d.phase_number AS phaseNumber,
       d.is_rest_day AS isRestDay,
       uds.status AS userStatus,
       uds.started_at AS startedAt,
       uds.completed_at AS completedAt
     FROM curriculum_days d
     JOIN curriculum_weeks w ON w.id = d.week_id
     LEFT JOIN user_day_state uds ON uds.day_id = d.id
     WHERE d.day_number = $1`,
    [dayNumber],
  );
  const row = dayRows[0];
  if (!row) throw new Error(`Curriculum Day ${dayNumber} was not found.`);

  const blockRows = await db.select<BlockRow[]>(
    `SELECT
       b.id,
       b.block_type AS blockType,
       b.label,
       b.sort_order AS sortOrder,
       b.planned_minutes AS plannedMinutes,
       b.instructions_markdown AS instructionsMarkdown,
       b.is_required AS isRequired,
       ubs.status AS userStatus,
       ubs.actual_minutes AS actualMinutes,
       ubs.note,
       t.state AS timerState,
       t.accumulated_seconds AS accumulatedSeconds,
       t.started_at AS timerStartedAt
     FROM curriculum_blocks b
     LEFT JOIN user_block_state ubs ON ubs.block_id = b.id
     LEFT JOIN timers t ON t.block_id = b.id
     WHERE b.day_id = $1
     ORDER BY b.sort_order`,
    [row.id],
  );

  const dodRows = await db.select<DodRow[]>(
    `SELECT
       d.id,
       d.sort_order AS sortOrder,
       d.text,
       d.is_required AS isRequired,
       uds.is_complete AS isComplete
     FROM definition_of_done_items d
     LEFT JOIN user_dod_state uds ON uds.dod_item_id = d.id
     WHERE d.day_id = $1
     ORDER BY d.sort_order`,
    [row.id],
  );

  const logRows = await db.select<LearningLogRow[]>(
    `SELECT
       learned,
       did,
       explain_without_notes AS explainWithoutNotes,
       confused,
       next_action AS nextAction
     FROM learning_logs
     WHERE day_id = $1`,
    [row.id],
  );

  const blocks: TodayBlock[] = blockRows.map((block) => ({
    id: block.id,
    type: block.blockType,
    label: block.label,
    sortOrder: block.sortOrder,
    plannedMinutes: block.plannedMinutes,
    instructionsMarkdown: block.instructionsMarkdown,
    required: block.isRequired === 1,
    status: (block.userStatus ?? "NOT_STARTED") as BlockStatus,
    actualMinutes: block.actualMinutes ?? 0,
    note: block.note ?? "",
    timer: {
      state: block.timerState ?? "STOPPED",
      accumulatedSeconds: block.accumulatedSeconds ?? 0,
      startedAt: block.timerStartedAt,
    },
  }));

  const dodItems: TodayDodItem[] = dodRows.map((item) => ({
    id: item.id,
    sortOrder: item.sortOrder,
    text: item.text,
    required: item.isRequired === 1,
    complete: item.isComplete === 1,
  }));

  return {
    id: row.id,
    dayNumber: row.dayNumber,
    date: row.date,
    dateLabel: row.dateLabel,
    weekNumber: row.weekNumber,
    phaseNumber: row.phaseNumber,
    isRestDay: row.isRestDay === 1,
    status: row.isRestDay ? "REST" : ((row.userStatus ?? "AVAILABLE") as TodayDay["status"]),
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    blocks,
    dodItems,
    learningLog: logRows[0] ?? emptyLog,
  };
}

async function ensureDayStarted(dayId: number): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `INSERT INTO user_day_state (day_id, status, started_at, actual_minutes)
     VALUES ($1, 'IN_PROGRESS', $2, 0)
     ON CONFLICT(day_id) DO UPDATE SET
       status = CASE WHEN user_day_state.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
       started_at = COALESCE(user_day_state.started_at, excluded.started_at)`,
    [dayId, timestamp],
  );
}

export async function startBlock(dayId: number, blockId: number): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await ensureDayStarted(dayId);
  await db.execute(
    `INSERT INTO user_block_state (block_id, status, started_at, actual_minutes)
     VALUES ($1, 'IN_PROGRESS', $2, 0)
     ON CONFLICT(block_id) DO UPDATE SET
       status = CASE WHEN user_block_state.status = 'COMPLETE' THEN 'COMPLETE' ELSE 'IN_PROGRESS' END,
       started_at = COALESCE(user_block_state.started_at, excluded.started_at)`,
    [blockId, timestamp],
  );
  await db.execute(
    `INSERT INTO timers (block_id, state, accumulated_seconds, started_at, updated_at)
     VALUES ($1, 'RUNNING', 0, $2, $2)
     ON CONFLICT(block_id) DO UPDATE SET
       state = 'RUNNING',
       started_at = CASE WHEN timers.state = 'RUNNING' THEN timers.started_at ELSE excluded.started_at END,
       updated_at = excluded.updated_at`,
    [blockId, timestamp],
  );
}

export async function pauseBlockTimer(blockId: number): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ state: TimerState; accumulatedSeconds: number; startedAt: string | null }>>(
    `SELECT state, accumulated_seconds AS accumulatedSeconds, started_at AS startedAt FROM timers WHERE block_id = $1`,
    [blockId],
  );
  const timer = rows[0];
  if (!timer || timer.state !== "RUNNING" || !timer.startedAt) return;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000));
  await db.execute(
    `UPDATE timers
     SET state = 'PAUSED', accumulated_seconds = accumulated_seconds + $2, started_at = NULL, updated_at = $3
     WHERE block_id = $1`,
    [blockId, elapsed, nowIso()],
  );
}

export async function resetBlockTimer(blockId: number): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO timers (block_id, state, accumulated_seconds, started_at, updated_at)
     VALUES ($1, 'STOPPED', 0, NULL, $2)
     ON CONFLICT(block_id) DO UPDATE SET state = 'STOPPED', accumulated_seconds = 0, started_at = NULL, updated_at = excluded.updated_at`,
    [blockId, nowIso()],
  );
}

export async function completeBlock(dayId: number, block: TodayBlock): Promise<void> {
  const db = await getDatabase();
  let totalSeconds = block.timer.accumulatedSeconds;
  if (block.timer.state === "RUNNING" && block.timer.startedAt) {
    totalSeconds += Math.max(0, Math.floor((Date.now() - new Date(block.timer.startedAt).getTime()) / 1000));
  }
  const actualMinutes = Math.max(0, Math.round(totalSeconds / 60));
  const timestamp = nowIso();
  await ensureDayStarted(dayId);
  await db.execute(
    `INSERT INTO user_block_state (block_id, status, started_at, completed_at, actual_minutes, note)
     VALUES ($1, 'COMPLETE', $2, $2, $3, $4)
     ON CONFLICT(block_id) DO UPDATE SET
       status = 'COMPLETE',
       started_at = COALESCE(user_block_state.started_at, excluded.started_at),
       completed_at = excluded.completed_at,
       actual_minutes = excluded.actual_minutes,
       note = excluded.note`,
    [block.id, timestamp, actualMinutes, block.note],
  );
  await db.execute(
    `INSERT INTO timers (block_id, state, accumulated_seconds, started_at, updated_at)
     VALUES ($1, 'PAUSED', $2, NULL, $3)
     ON CONFLICT(block_id) DO UPDATE SET state = 'PAUSED', accumulated_seconds = excluded.accumulated_seconds, started_at = NULL, updated_at = excluded.updated_at`,
    [block.id, totalSeconds, timestamp],
  );
}

export async function setBlockNote(blockId: number, note: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO user_block_state (block_id, status, actual_minutes, note)
     VALUES ($1, 'NOT_STARTED', 0, $2)
     ON CONFLICT(block_id) DO UPDATE SET note = excluded.note`,
    [blockId, note],
  );
}

export async function setDodComplete(dodItemId: number, complete: boolean): Promise<void> {
  const db = await getDatabase();
  const timestamp = complete ? nowIso() : null;
  await db.execute(
    `INSERT INTO user_dod_state (dod_item_id, is_complete, completed_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(dod_item_id) DO UPDATE SET is_complete = excluded.is_complete, completed_at = excluded.completed_at`,
    [dodItemId, complete ? 1 : 0, timestamp],
  );
}

export async function saveLearningLog(dayId: number, blockId: number, log: LearningLogDraft): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await ensureDayStarted(dayId);
  await db.execute(
    `INSERT INTO learning_logs (day_id, learned, did, explain_without_notes, confused, next_action, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT(day_id) DO UPDATE SET
       learned = excluded.learned,
       did = excluded.did,
       explain_without_notes = excluded.explain_without_notes,
       confused = excluded.confused,
       next_action = excluded.next_action,
       updated_at = excluded.updated_at`,
    [dayId, log.learned, log.did, log.explainWithoutNotes, log.confused, log.nextAction, timestamp],
  );
  await db.execute(
    `INSERT INTO user_block_state (block_id, status, started_at, completed_at, actual_minutes)
     VALUES ($1, 'COMPLETE', $2, $2, 0)
     ON CONFLICT(block_id) DO UPDATE SET status = 'COMPLETE', started_at = COALESCE(user_block_state.started_at, excluded.started_at), completed_at = excluded.completed_at`,
    [blockId, timestamp],
  );
}

export async function completeDay(day: TodayDay): Promise<void> {
  const db = await getDatabase();
  const actualMinutes = day.blocks.reduce((sum, block) => sum + block.actualMinutes, 0);
  const timestamp = nowIso();
  await db.execute(
    `INSERT INTO user_day_state (day_id, status, started_at, completed_at, actual_minutes)
     VALUES ($1, 'COMPLETED', $2, $2, $3)
     ON CONFLICT(day_id) DO UPDATE SET status = 'COMPLETED', started_at = COALESCE(user_day_state.started_at, excluded.started_at), completed_at = excluded.completed_at, actual_minutes = excluded.actual_minutes`,
    [day.id, timestamp, actualMinutes],
  );
}


export async function heartbeatRunningTimers(): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    blockId: number;
    startedAt: string;
    accumulatedSeconds: number;
  }>>(
    `SELECT
       block_id AS blockId,
       started_at AS startedAt,
       accumulated_seconds AS accumulatedSeconds
     FROM timers
     WHERE state = 'RUNNING' AND started_at IS NOT NULL`,
  );

  const timestamp = nowIso();
  const nowMs = Date.now();
  for (const timer of rows) {
    const elapsed = Math.max(
      0,
      Math.floor((nowMs - new Date(timer.startedAt).getTime()) / 1000),
    );
    await db.execute(
      `UPDATE timers
       SET accumulated_seconds = $2,
           started_at = $3,
           updated_at = $3
       WHERE block_id = $1 AND state = 'RUNNING'`,
      [timer.blockId, timer.accumulatedSeconds + elapsed, timestamp],
    );
  }
}
