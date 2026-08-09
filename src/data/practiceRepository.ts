import { getDatabase } from "./db";
import { practiceLessonComplete } from "../engine/domain/practice/rules";
import type {
  PracticeChallenge,
  PracticeLesson,
  PracticeLog,
  PracticePreference,
  PracticeRating,
  PracticeResource,
  PracticeStage,
} from "../engine/domain/practice/types";

function nowIso(): string {
  return new Date().toISOString();
}

export async function getPracticeStages(): Promise<PracticeStage[]> {
  const db = await getDatabase();

  const stageRows = await db.select<Array<{
    id: number;
    sortOrder: number;
    title: string;
    goal: string;
    unlockAfterStageId: number | null;
  }>>(
    `SELECT
       id,
       sort_order AS sortOrder,
       title,
       goal,
       unlock_after_stage_id AS unlockAfterStageId
     FROM practice_stages
     ORDER BY sort_order`,
  );

  const lessonRows = await db.select<Array<{
    id: number;
    stageId: number;
    sortOrder: number;
    title: string;
    concept: string;
    practiceAssignment: string;
    reviewPrompts: string;
    learned: number;
    practiced: number;
    reviewed: number;
    selectedExplained: number;
    notes: string;
    completedAt: string | null;
  }>>(
    `SELECT
       l.id,
       l.stage_id AS stageId,
       l.sort_order AS sortOrder,
       l.title,
       l.concept,
       l.practice_assignment AS practiceAssignment,
       l.review_prompts AS reviewPrompts,
       COALESCE(s.learned,0) AS learned,
       COALESCE(s.practiced,0) AS practiced,
       COALESCE(s.reviewed,0) AS reviewed,
       COALESCE(s.selected_explained,0) AS selectedExplained,
       COALESCE(s.notes,'') AS notes,
       s.completed_at AS completedAt
     FROM practice_lessons l
     LEFT JOIN practice_lesson_state s ON s.lesson_id=l.id
     ORDER BY l.stage_id,l.sort_order`,
  );

  const resources = await db.select<Array<PracticeResource & { lessonId: number }>>(
    `SELECT
       id,
       lesson_id AS lessonId,
       label,
       url,
       resource_type AS resourceType,
       note
     FROM practice_resources
     ORDER BY id`,
  );

  const lessonsByStage = new Map<number, PracticeLesson[]>();
  for (const row of lessonRows) {
    const lesson: PracticeLesson = {
      ...row,
      learned: row.learned === 1,
      practiced: row.practiced === 1,
      reviewed: row.reviewed === 1,
      selectedExplained: row.selectedExplained === 1,
      resources: resources
        .filter((resource) => resource.lessonId === row.id)
        .map(({ lessonId: _lessonId, ...resource }) => resource),
    };
    lessonsByStage.set(row.stageId, [...(lessonsByStage.get(row.stageId) ?? []), lesson]);
  }

  const completedStages = new Set<number>();
  for (const stage of stageRows) {
    const lessons = lessonsByStage.get(stage.id) ?? [];
    if (lessons.length > 0 && lessons.every((lesson) => lesson.completedAt !== null)) {
      completedStages.add(stage.id);
    }
  }

  return stageRows.map((stage) => {
    const lessons = lessonsByStage.get(stage.id) ?? [];
    return {
      ...stage,
      unlocked: stage.unlockAfterStageId === null || completedStages.has(stage.unlockAfterStageId),
      complete: lessons.length > 0 && lessons.every((lesson) => lesson.completedAt !== null),
      lessons,
    };
  });
}

export async function savePracticeLessonState(
  lessonId: number,
  learned: boolean,
  practiced: boolean,
  reviewed: boolean,
  selectedExplained: boolean,
  notes: string,
): Promise<void> {
  const db = await getDatabase();
  const complete = practiceLessonComplete({
    learned,
    practiced,
    reviewed,
    selectedExplained,
  });
  await db.execute(
    `INSERT INTO practice_lesson_state
     (lesson_id,learned,practiced,reviewed,selected_explained,notes,completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(lesson_id) DO UPDATE SET
       learned=excluded.learned,
       practiced=excluded.practiced,
       reviewed=excluded.reviewed,
       selected_explained=excluded.selected_explained,
       notes=excluded.notes,
       completed_at=excluded.completed_at`,
    [
      lessonId,
      learned ? 1 : 0,
      practiced ? 1 : 0,
      reviewed ? 1 : 0,
      selectedExplained ? 1 : 0,
      notes.trim(),
      complete ? nowIso() : null,
    ],
  );
}

export async function getPracticeLogs(): Promise<PracticeLog[]> {
  const db = await getDatabase();
  return db.select<PracticeLog[]>(
    `SELECT
       l.id,
       l.lesson_id AS lessonId,
       pl.title AS lessonTitle,
       l.title,
       l.practice_date AS practiceDate,
       l.goal,
       l.quantity,
       l.representative_file AS representativeFile,
       l.best_notes AS bestNotes,
       l.worst_notes AS worstNotes,
       l.reflection,
       l.created_at AS createdAt
     FROM practice_logs l
     LEFT JOIN practice_lessons pl ON pl.id=l.lesson_id
     ORDER BY l.practice_date DESC,l.id DESC`,
  );
}

export async function createPracticeLog(
  input: Omit<PracticeLog, "id" | "lessonTitle" | "createdAt">,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO practice_logs
     (lesson_id,title,practice_date,goal,quantity,representative_file,best_notes,worst_notes,reflection,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      input.lessonId,
      input.title.trim(),
      input.practiceDate,
      input.goal.trim(),
      input.quantity,
      input.representativeFile?.trim() || null,
      input.bestNotes.trim(),
      input.worstNotes.trim(),
      input.reflection.trim(),
      nowIso(),
    ],
  );
}

export async function getPracticePreferences(): Promise<PracticePreference[]> {
  const db = await getDatabase();
  return db.select<PracticePreference[]>(
    `SELECT
       c.id AS categoryId,
       c.name,
       p.rating,
       COALESCE(p.note,'') AS note
     FROM practice_categories c
     LEFT JOIN practice_preferences p ON p.category_id=c.id
     ORDER BY c.id`,
  );
}

export async function savePracticePreference(
  categoryId: number,
  rating: PracticeRating,
  note: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO practice_preferences (category_id,rating,note,updated_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(category_id) DO UPDATE SET
       rating=excluded.rating,
       note=excluded.note,
       updated_at=excluded.updated_at`,
    [categoryId, rating, note.trim(), nowIso()],
  );
}

export async function getPracticeChallenges(
  maximumStageOrder: number,
): Promise<PracticeChallenge[]> {
  const db = await getDatabase();
  return db.select<PracticeChallenge[]>(
    `SELECT
       id,
       minimum_stage_order AS minimumStageOrder,
       title,
       prompt
     FROM practice_challenges
     WHERE minimum_stage_order <= $1
     ORDER BY id`,
    [maximumStageOrder],
  );
}
