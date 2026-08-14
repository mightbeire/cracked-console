import { getDatabase } from "./db";

export type TeacherResourceRole =
  | "PRIMARY"
  | "VISUAL"
  | "INTERACTIVE"
  | "REFERENCE"
  | "RESCUE"
  | "LAB";

export interface TeacherResourceMetadata {
  url: string;
  modality: string;
  verified: boolean;
  provider: string;
  segment: string;
  use: string;
  notice: string;
  why: string;
}

export interface WeekTeacherResource extends TeacherResourceMetadata {
  id: number;
  role: TeacherResourceRole;
  title: string;
}

interface TeacherResourceRow {
  id: number;
  type: string;
  title: string;
  instructionsJson: string;
}

function roleFromBlockType(type: string): TeacherResourceRole {
  const suffix = type.toUpperCase().replace(/^WEEK_RESOURCE_/, "");
  if (suffix === "VISUAL") return "VISUAL";
  if (suffix === "INTERACTIVE") return "INTERACTIVE";
  if (suffix === "REFERENCE") return "REFERENCE";
  if (suffix === "RESCUE") return "RESCUE";
  if (suffix === "LAB") return "LAB";
  return "PRIMARY";
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseTeacherResourceMetadata(value: string): TeacherResourceMetadata | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const url = stringField(parsed.url);
    if (!/^https?:\/\//i.test(url)) return null;
    return {
      url,
      modality: stringField(parsed.modality) || "RESOURCE",
      verified: parsed.verified === true,
      provider: stringField(parsed.provider),
      segment: stringField(parsed.segment),
      use: stringField(parsed.use),
      notice: stringField(parsed.notice),
      why: stringField(parsed.why),
    };
  } catch {
    return null;
  }
}

export async function getWeekTeacherShelf(weekId: number): Promise<WeekTeacherResource[]> {
  const db = await getDatabase();
  const rows = await db.select<TeacherResourceRow[]>(
    `SELECT
       b.id,
       b.block_type AS type,
       b.label AS title,
       b.instructions_markdown AS instructionsJson
     FROM curriculum_blocks b
     JOIN curriculum_days d ON d.id = b.day_id
     WHERE d.week_id = $1
       AND upper(b.block_type) LIKE 'WEEK_RESOURCE_%'
     ORDER BY d.day_number, b.sort_order`,
    [weekId],
  );

  return rows.flatMap((row) => {
    const metadata = parseTeacherResourceMetadata(row.instructionsJson);
    if (!metadata) return [];
    return [{
      id: row.id,
      role: roleFromBlockType(row.type),
      title: row.title,
      ...metadata,
    }];
  });
}
