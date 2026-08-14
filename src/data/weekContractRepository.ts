import { getDatabase } from "./db";

export interface WeekContractSection {
  id: number;
  type: string;
  label: string;
  instructionsMarkdown: string;
}

export async function getWeekContractSections(weekId: number): Promise<WeekContractSection[]> {
  const db = await getDatabase();
  return db.select<WeekContractSection[]>(
    `SELECT
       b.id,
       b.block_type AS type,
       b.label,
       b.instructions_markdown AS instructionsMarkdown
     FROM curriculum_blocks b
     JOIN curriculum_days d ON d.id = b.day_id
     WHERE d.week_id = $1
       AND upper(b.block_type) LIKE 'WEEK_%'
     ORDER BY d.day_number, b.sort_order`,
    [weekId],
  );
}
