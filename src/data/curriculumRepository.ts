import { getDatabase } from "./db";
import { parseTeacherResourceMetadata } from "./weekTeacherShelfRepository";

export interface CurriculumWeekSummary {
  weekNumber: number;
  firstDay: number;
  lastDay: number;
  dateRangeLabel: string;
  title: string;
  phaseNumber: number;
  isConsolidation: boolean;
  completedDays: number;
  activeDays: number;
}

export interface CurriculumDaySummary {
  dayNumber: number;
  dateLabel: string;
  isRestDay: boolean;
  status: string;
}

export interface CurriculumWeekDetail extends CurriculumWeekSummary {
  days: CurriculumDaySummary[];
}

export interface CurriculumBlockDetail {
  id: number;
  type: string;
  label: string;
  plannedMinutes: number;
  instructions: string;
  required: boolean;
}

export interface CurriculumDayDetail {
  dayNumber: number;
  dateLabel: string;
  weekNumber: number;
  phaseNumber: number;
  isRestDay: boolean;
  status: string;
  blocks: CurriculumBlockDetail[];
  definitionOfDone: string[];
}

export interface CurriculumResource {
  id: number;
  label: string;
  url: string;
}

export type CurriculumSearchResult =
  | { kind: "DAY"; key: string; title: string; meta: string; snippet: string; dayNumber: number }
  | { kind: "WEEK"; key: string; title: string; meta: string; snippet: string; weekNumber: number }
  | { kind: "RESOURCE"; key: string; title: string; meta: string; snippet: string; url: string };

interface TeacherResourceSearchRow {
  id: number;
  label: string;
  instructionsJson: string;
}

function effectiveStatus(isRestDay: number, userStatus: string | null): string {
  if (isRestDay === 1) return "REST";
  return userStatus ?? "UPCOMING";
}

function parseTeacherResourceRows(rows: TeacherResourceSearchRow[]): CurriculumResource[] {
  return rows.flatMap((row) => {
    const metadata = parseTeacherResourceMetadata(row.instructionsJson);
    if (!metadata) return [];
    return [{ id: -row.id, label: row.label, url: metadata.url }];
  });
}

function dedupeResources(resources: CurriculumResource[]): CurriculumResource[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    const key = `${resource.label}\n${resource.url}`.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getCurriculumWeeks(): Promise<CurriculumWeekSummary[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    weekNumber: number;
    firstDay: number;
    lastDay: number;
    dateRangeLabel: string;
    title: string;
    phaseNumber: number;
    isConsolidation: number;
    completedDays: number;
    activeDays: number;
  }>>(
    `SELECT
       w.week_number AS weekNumber,
       w.first_day AS firstDay,
       w.last_day AS lastDay,
       w.date_range_label AS dateRangeLabel,
       w.title,
       w.phase_number AS phaseNumber,
       w.is_consolidation AS isConsolidation,
       SUM(CASE WHEN d.is_rest_day=0 AND uds.status='COMPLETED' THEN 1 ELSE 0 END) AS completedDays,
       SUM(CASE WHEN d.is_rest_day=0 THEN 1 ELSE 0 END) AS activeDays
     FROM curriculum_weeks w
     JOIN curriculum_days d ON d.week_id=w.id
     LEFT JOIN user_day_state uds ON uds.day_id=d.id
     GROUP BY w.id
     ORDER BY w.week_number`,
  );
  return rows.map((row) => ({
    ...row,
    isConsolidation: row.isConsolidation === 1,
  }));
}

export async function getCurriculumWeek(weekNumber: number): Promise<CurriculumWeekDetail> {
  const weeks = await getCurriculumWeeks();
  const week = weeks.find((item) => item.weekNumber === weekNumber);
  if (!week) throw new Error(`Week ${weekNumber} was not found.`);
  const db = await getDatabase();
  const rows = await db.select<Array<{
    dayNumber: number;
    dateLabel: string;
    isRestDay: number;
    userStatus: string | null;
  }>>(
    `SELECT
       d.day_number AS dayNumber,
       d.date_label AS dateLabel,
       d.is_rest_day AS isRestDay,
       uds.status AS userStatus
     FROM curriculum_days d
     LEFT JOIN user_day_state uds ON uds.day_id=d.id
     JOIN curriculum_weeks w ON w.id=d.week_id
     WHERE w.week_number=$1
     ORDER BY d.day_number`,
    [weekNumber],
  );
  return {
    ...week,
    days: rows.map((row) => ({
      dayNumber: row.dayNumber,
      dateLabel: row.dateLabel,
      isRestDay: row.isRestDay === 1,
      status: effectiveStatus(row.isRestDay, row.userStatus),
    })),
  };
}

export async function getCurriculumDayDetail(dayNumber: number): Promise<CurriculumDayDetail> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    id: number;
    dayNumber: number;
    dateLabel: string;
    weekNumber: number;
    phaseNumber: number;
    isRestDay: number;
    userStatus: string | null;
  }>>(
    `SELECT
       d.id,
       d.day_number AS dayNumber,
       d.date_label AS dateLabel,
       w.week_number AS weekNumber,
       d.phase_number AS phaseNumber,
       d.is_rest_day AS isRestDay,
       uds.status AS userStatus
     FROM curriculum_days d
     JOIN curriculum_weeks w ON w.id=d.week_id
     LEFT JOIN user_day_state uds ON uds.day_id=d.id
     WHERE d.day_number=$1`,
    [dayNumber],
  );
  const row = rows[0];
  if (!row) throw new Error(`Day ${dayNumber} was not found.`);

  const blocks = await db.select<Array<{
    id: number;
    type: string;
    label: string;
    plannedMinutes: number;
    instructions: string;
    required: number;
  }>>(
    `SELECT
       id,
       block_type AS type,
       label,
       planned_minutes AS plannedMinutes,
       instructions_markdown AS instructions,
       is_required AS required
     FROM curriculum_blocks
     WHERE day_id=$1
       AND upper(block_type) NOT LIKE 'WEEK_RESOURCE_%'
     ORDER BY sort_order`,
    [row.id],
  );
  const dod = await db.select<Array<{ text: string }>>(
    `SELECT text
     FROM definition_of_done_items
     WHERE day_id=$1
     ORDER BY sort_order`,
    [row.id],
  );

  return {
    dayNumber: row.dayNumber,
    dateLabel: row.dateLabel,
    weekNumber: row.weekNumber,
    phaseNumber: row.phaseNumber,
    isRestDay: row.isRestDay === 1,
    status: effectiveStatus(row.isRestDay, row.userStatus),
    blocks: blocks.map((block) => ({ ...block, required: block.required === 1 })),
    definitionOfDone: dod.map((item) => item.text),
  };
}

export async function getCurriculumResources(limit = 250): Promise<CurriculumResource[]> {
  const db = await getDatabase();
  const [catalogResources, teacherRows] = await Promise.all([
    db.select<CurriculumResource[]>(
      `SELECT id,label,url
       FROM curriculum_resources
       ORDER BY label COLLATE NOCASE
       LIMIT $1`,
      [limit],
    ),
    db.select<TeacherResourceSearchRow[]>(
      `SELECT
         id,
         label,
         instructions_markdown AS instructionsJson
       FROM curriculum_blocks
       WHERE upper(block_type) LIKE 'WEEK_RESOURCE_%'
       ORDER BY label COLLATE NOCASE
       LIMIT $1`,
      [limit],
    ),
  ]);

  return dedupeResources([
    ...catalogResources,
    ...parseTeacherResourceRows(teacherRows),
  ])
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, limit);
}

export async function searchCurriculum(rawQuery: string): Promise<CurriculumSearchResult[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return [];
  const db = await getDatabase();
  const like = `%${query}%`;

  const [dayRows, weekRows, catalogResources, teacherRows] = await Promise.all([
    db.select<Array<{
      dayNumber: number;
      dateLabel: string;
      snippet: string;
    }>>(
      `SELECT
         d.day_number AS dayNumber,
         d.date_label AS dateLabel,
         COALESCE((
           SELECT group_concat(b.label || ': ' || b.instructions_markdown, ' ')
           FROM curriculum_blocks b
           WHERE b.day_id=d.id
         ), '') AS snippet
       FROM curriculum_days d
       WHERE CAST(d.day_number AS TEXT) LIKE $1
          OR d.date_label LIKE $1
          OR EXISTS (
            SELECT 1 FROM curriculum_blocks b
            WHERE b.day_id=d.id
              AND (b.label LIKE $1 OR b.instructions_markdown LIKE $1 OR b.block_type LIKE $1)
          )
       ORDER BY d.day_number
       LIMIT 30`,
      [like],
    ),
    db.select<Array<{
      weekNumber: number;
      dateRangeLabel: string;
      title: string;
    }>>(
      `SELECT
         week_number AS weekNumber,
         date_range_label AS dateRangeLabel,
         title
       FROM curriculum_weeks
       WHERE CAST(week_number AS TEXT) LIKE $1
          OR title LIKE $1
          OR date_range_label LIKE $1
       ORDER BY week_number
       LIMIT 20`,
      [like],
    ),
    db.select<CurriculumResource[]>(
      `SELECT id,label,url
       FROM curriculum_resources
       WHERE label LIKE $1 OR url LIKE $1
       ORDER BY label COLLATE NOCASE
       LIMIT 30`,
      [like],
    ),
    db.select<TeacherResourceSearchRow[]>(
      `SELECT
         id,
         label,
         instructions_markdown AS instructionsJson
       FROM curriculum_blocks
       WHERE upper(block_type) LIKE 'WEEK_RESOURCE_%'
         AND (label LIKE $1 OR instructions_markdown LIKE $1)
       ORDER BY label COLLATE NOCASE
       LIMIT 30`,
      [like],
    ),
  ]);

  const teacherResources = parseTeacherResourceRows(teacherRows);
  const resources = dedupeResources([...catalogResources, ...teacherResources]);
  const trim = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 180);

  return [
    ...dayRows.map((row): CurriculumSearchResult => ({
      kind: "DAY",
      key: `day-${row.dayNumber}`,
      title: `Day ${String(row.dayNumber).padStart(3, "0")}`,
      meta: row.dateLabel,
      snippet: trim(row.snippet),
      dayNumber: row.dayNumber,
    })),
    ...weekRows.map((row): CurriculumSearchResult => ({
      kind: "WEEK",
      key: `week-${row.weekNumber}`,
      title: `Week ${row.weekNumber} · ${row.title}`,
      meta: row.dateRangeLabel,
      snippet: "Open this configured week.",
      weekNumber: row.weekNumber,
    })),
    ...resources.map((row): CurriculumSearchResult => ({
      kind: "RESOURCE",
      key: row.id < 0 ? `teacher-resource-${Math.abs(row.id)}` : `resource-${row.id}`,
      title: row.label,
      meta: row.id < 0 ? "Teacher Shelf resource" : "Resource",
      snippet: row.url,
      url: row.url,
    })),
  ].slice(0, 60);
}
