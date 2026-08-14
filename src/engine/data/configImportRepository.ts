import { invoke } from "@tauri-apps/api/core";
import type { CommunityConfig, ConfigSummary } from "../config/types";
import { summarizeCommunityConfig } from "../config/validate";
import { getDatabase } from "./db";

interface CountRow { count: number; }
interface SqlOperation { sql: string; params: Array<string | number | boolean | null>; }

function bit(value: boolean | undefined): number { return value ? 1 : 0; }

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));
}

function operation(operations: SqlOperation[], sql: string, params: SqlOperation["params"]): void {
  operations.push({ sql, params });
}

export async function hasImportedPlan(): Promise<boolean> {
  const db = await getDatabase();
  const rows = await db.select<CountRow[]>("SELECT COUNT(*) AS count FROM curriculum_versions");
  return (rows[0]?.count ?? 0) > 0;
}

export async function importCommunityConfig(
  config: CommunityConfig,
  rawSource: string,
  sourceFileName: string,
): Promise<ConfigSummary> {
  if (await hasImportedPlan()) throw new Error("A plan is already configured. Stage 3 does not replace an active plan.");

  const db = await getDatabase();
  const existingSidePaths = await db.select<CountRow[]>("SELECT COUNT(*) AS count FROM side_paths");
  const importSidePaths = (existingSidePaths[0]?.count ?? 0) === 0;
  const summary = summarizeCommunityConfig(config);
  const sourceHash = await sha256(rawSource);
  const importedAt = new Date().toISOString();
  const operations: SqlOperation[] = [];

  operation(operations, `INSERT INTO curriculum_versions
     (id, version, title, source_file_name, source_sha256, imported_at, day_count, week_count, start_date, end_date)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
    config.plan.version, config.plan.title, sourceFileName, sourceHash, importedAt,
    summary.days, summary.weeks, summary.startDate, summary.endDate,
  ]);

  let dayId = 1;
  let blockId = 1;
  let dodId = 1;
  for (let weekIndex = 0; weekIndex < config.plan.weeks.length; weekIndex += 1) {
    const week = config.plan.weeks[weekIndex]!;
    const firstDay = dayId;
    const lastDay = dayId + week.days.length - 1;
    const firstDate = week.days[0]!.date;
    const lastDate = week.days.at(-1)!.date;
    const weekId = weekIndex + 1;
    operation(operations, `INSERT INTO curriculum_weeks
       (id, curriculum_version_id, week_number, first_day, last_day, date_range_label, title, phase_number, is_consolidation)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`, [
      weekId, weekIndex + 1, firstDay, lastDay, `${firstDate} to ${lastDate}`, week.title, week.phase ?? 1, bit(week.consolidation),
    ]);

    for (const day of week.days) {
      const phase = day.phase ?? week.phase ?? 1;
      operation(operations, `INSERT INTO curriculum_days
         (id, curriculum_version_id, week_id, day_number, date, date_label, phase_number, is_rest_day, source_text)
         VALUES ($1, 1, $2, $3, $4, $5, $6, $7, '')`, [
        dayId, weekId, dayId, day.date, day.label?.trim() || dateLabel(day.date), phase, bit(day.rest),
      ]);
      for (let blockIndex = 0; blockIndex < day.blocks.length; blockIndex += 1) {
        const block = day.blocks[blockIndex]!;
        operation(operations, `INSERT INTO curriculum_blocks
           (id, day_id, block_type, sort_order, label, planned_minutes, instructions_markdown, is_required)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
          blockId, dayId, block.type, blockIndex + 1, block.label, block.plannedMinutes, block.instructions, bit(block.required),
        ]);
        blockId += 1;
      }
      for (let itemIndex = 0; itemIndex < day.definitionOfDone.length; itemIndex += 1) {
        operation(operations, `INSERT INTO definition_of_done_items
           (id, day_id, sort_order, text, is_required) VALUES ($1, $2, $3, $4, 1)`, [
          dodId, dayId, itemIndex + 1, day.definitionOfDone[itemIndex]!,
        ]);
        dodId += 1;
      }
      dayId += 1;
    }
  }

  for (let index = 0; index < (config.plan.resources ?? []).length; index += 1) {
    const resource = config.plan.resources![index]!;
    operation(operations, `INSERT INTO curriculum_resources (id, curriculum_version_id, label, url) VALUES ($1, 1, $2, $3)`, [index + 1, resource.label, resource.url]);
  }

  for (let index = 0; index < config.skills.length; index += 1) {
    const skill = config.skills[index]!;
    operation(operations, `INSERT INTO skills (id, code, name, family, sort_order) VALUES ($1, $2, $3, $4, $5)`, [index + 1, skill.code, skill.name, skill.family, index + 1]);
  }

  let milestoneId = 1;
  for (let index = 0; index < config.projects.length; index += 1) {
    const project = config.projects[index]!;
    const projectId = index + 1;
    operation(operations, `INSERT INTO project_catalog
       (id, code, name, core_integration, start_day, end_day, defence_assessment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
      projectId, project.code, project.name, project.coreIntegration, project.startDay, project.endDay, project.defenceAssessmentType,
    ]);
    for (let milestoneIndex = 0; milestoneIndex < project.milestones.length; milestoneIndex += 1) {
      const milestone = project.milestones[milestoneIndex]!;
      operation(operations, `INSERT INTO project_milestones
         (id, project_id, sort_order, title, description) VALUES ($1, $2, $3, $4, $5)`, [
        milestoneId, projectId, milestoneIndex + 1, milestone.title, milestone.description,
      ]);
      milestoneId += 1;
    }
  }

  if (config.reading) {
    for (let index = 0; index < config.reading.months.length; index += 1) {
      const month = config.reading.months[index]!;
      operation(operations, `INSERT INTO reading_months (id, title, start_date, end_date, required_count) VALUES ($1, $2, $3, $4, $5)`, [index + 1, month.title, month.startDate, month.endDate, month.requiredCount]);
    }
    for (let index = 0; index < config.reading.books.length; index += 1) {
      const book = config.reading.books[index]!;
      operation(operations, `INSERT INTO reading_books
         (id, month_id, slot, title, author, is_short, is_bonus, is_reread, bespoke_assignment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
        index + 1, book.month, book.slot, book.title, book.author, bit(book.shortRead), bit(book.bonus), bit(book.reread), book.assignment,
      ]);
    }
  }

  if (config.practice) {
    for (let stageIndex = 0; stageIndex < config.practice.stages.length; stageIndex += 1) {
      const stage = config.practice.stages[stageIndex]!;
      operation(operations, `INSERT INTO practice_stages
         (id, sort_order, title, goal, unlock_after_stage_id) VALUES ($1, $2, $3, $4, $5)`, [stageIndex + 1, stageIndex + 1, stage.title, stage.goal, stage.unlockAfterStage ?? null]);
    }
    let lessonId = 1;
    let resourceId = 1;
    for (let stageIndex = 0; stageIndex < config.practice.stages.length; stageIndex += 1) {
      const stage = config.practice.stages[stageIndex]!;
      for (let lessonIndex = 0; lessonIndex < stage.lessons.length; lessonIndex += 1) {
        const lesson = stage.lessons[lessonIndex]!;
        const currentLessonId = lessonId;
        operation(operations, `INSERT INTO practice_lessons
           (id, stage_id, sort_order, title, concept, practice_assignment, review_prompts)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`, [currentLessonId, stageIndex + 1, lessonIndex + 1, lesson.title, lesson.concept, lesson.practiceAssignment, lesson.reviewPrompts]);
        for (const resource of lesson.resources ?? []) {
          operation(operations, `INSERT INTO practice_resources
             (id, lesson_id, label, url, resource_type, note) VALUES ($1, $2, $3, $4, 'LINK', '')`, [resourceId, currentLessonId, resource.label, resource.url]);
          resourceId += 1;
        }
        lessonId += 1;
      }
    }
    for (let index = 0; index < (config.practice.categories ?? []).length; index += 1) {
      operation(operations, `INSERT INTO practice_categories (id, name) VALUES ($1, $2)`, [index + 1, config.practice.categories![index]!]);
    }
    for (let index = 0; index < (config.practice.challenges ?? []).length; index += 1) {
      const challenge = config.practice.challenges![index]!;
      operation(operations, `INSERT INTO practice_challenges
         (id, minimum_stage_order, title, prompt) VALUES ($1, $2, $3, $4)`, [index + 1, challenge.minimumStage, challenge.title, challenge.prompt]);
    }
  }

  if (importSidePaths && config.sidePaths?.length) {
    let stageId = 1;
    let itemId = 1;
    for (let pathIndex = 0; pathIndex < config.sidePaths.length; pathIndex += 1) {
      const path = config.sidePaths[pathIndex]!;
      const pathId = pathIndex + 1;
      operation(operations, `INSERT INTO side_paths (id, code, title, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [pathId, path.code, path.title, path.description, pathIndex + 1]);
      for (let stageIndex = 0; stageIndex < path.stages.length; stageIndex += 1) {
        const stage = path.stages[stageIndex]!;
        const currentStageId = stageId;
        operation(operations, `INSERT INTO side_path_stages (id, side_path_id, sort_order, title, description) VALUES ($1, $2, $3, $4, $5)`, [currentStageId, pathId, stageIndex + 1, stage.title, stage.description]);
        for (let itemIndex = 0; itemIndex < stage.items.length; itemIndex += 1) {
          const item = stage.items[itemIndex]!;
          operation(operations, `INSERT INTO side_path_items
             (id, stage_id, sort_order, item_type, title, creator, description, difficulty, resource_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            itemId, currentStageId, itemIndex + 1, item.type, item.title, item.creator ?? "", item.description, item.difficulty ?? "", item.url ?? null,
          ]);
          itemId += 1;
        }
        stageId += 1;
      }
    }
  }

  await invoke("execute_sql_transaction", { operations });
  return { ...summary, sidePaths: config.sidePaths?.length ?? 0, sidePathItems: config.sidePaths?.reduce((sum, path) => sum + path.stages.reduce((stageSum, stage) => stageSum + stage.items.length, 0), 0) ?? 0 };
}

export async function getImportedConfigSummary(): Promise<ConfigSummary | null> {
  const db = await getDatabase();
  const versionRows = await db.select<Array<{ title: string; version: string; startDate: string; endDate: string; weeks: number; days: number }>>(
    `SELECT title, version, start_date AS startDate, end_date AS endDate, week_count AS weeks, day_count AS days FROM curriculum_versions LIMIT 1`,
  );
  const version = versionRows[0];
  if (!version) return null;
  async function count(query: string): Promise<number> {
    const rows = await db.select<CountRow[]>(query);
    return rows[0]?.count ?? 0;
  }
  return {
    ...version,
    activeDays: await count("SELECT COUNT(*) AS count FROM curriculum_days WHERE is_rest_day = 0"),
    restDays: await count("SELECT COUNT(*) AS count FROM curriculum_days WHERE is_rest_day = 1"),
    blocks: await count("SELECT COUNT(*) AS count FROM curriculum_blocks"),
    skills: await count("SELECT COUNT(*) AS count FROM skills"),
    projects: await count("SELECT COUNT(*) AS count FROM project_catalog"),
    readingBooks: await count("SELECT COUNT(*) AS count FROM reading_books"),
    practiceStages: await count("SELECT COUNT(*) AS count FROM practice_stages"),
    practiceLessons: await count("SELECT COUNT(*) AS count FROM practice_lessons"),
    sidePaths: await count("SELECT COUNT(*) AS count FROM side_paths"),
    sidePathItems: await count("SELECT COUNT(*) AS count FROM side_path_items"),
  };
}
