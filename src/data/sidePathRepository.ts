import { getDatabase } from "./db";

export type SidePathItemStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface SidePathNavigationItem {
  id: number;
  code: string;
  title: string;
}

export interface SidePathItem {
  id: number;
  stageId: number;
  sortOrder: number;
  type: string;
  title: string;
  creator: string;
  description: string;
  difficulty: string;
  resourceUrl: string | null;
  status: SidePathItemStatus;
  note: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SidePathStage {
  id: number;
  sortOrder: number;
  title: string;
  description: string;
  items: SidePathItem[];
}

export interface SidePathDetail {
  id: number;
  code: string;
  title: string;
  description: string;
  stages: SidePathStage[];
  completedItems: number;
  totalItems: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getSidePathNavigation(): Promise<SidePathNavigationItem[]> {
  const db = await getDatabase();
  return db.select<SidePathNavigationItem[]>(
    `SELECT id, code, title
     FROM side_paths
     ORDER BY sort_order, id`,
  );
}

export async function getSidePath(pathId: number): Promise<SidePathDetail | null> {
  const db = await getDatabase();
  const paths = await db.select<Array<{ id: number; code: string; title: string; description: string }>>(
    `SELECT id, code, title, description FROM side_paths WHERE id = $1 LIMIT 1`,
    [pathId],
  );
  const path = paths[0];
  if (!path) return null;

  const stageRows = await db.select<Array<{ id: number; sortOrder: number; title: string; description: string }>>(
    `SELECT id, sort_order AS sortOrder, title, description
     FROM side_path_stages
     WHERE side_path_id = $1
     ORDER BY sort_order, id`,
    [pathId],
  );

  const itemRows = await db.select<SidePathItem[]>(
    `SELECT
       i.id,
       i.stage_id AS stageId,
       i.sort_order AS sortOrder,
       i.item_type AS type,
       i.title,
       i.creator,
       i.description,
       i.difficulty,
       i.resource_url AS resourceUrl,
       COALESCE(s.status, 'NOT_STARTED') AS status,
       COALESCE(s.note, '') AS note,
       s.started_at AS startedAt,
       s.completed_at AS completedAt
     FROM side_path_items i
     JOIN side_path_stages st ON st.id = i.stage_id
     LEFT JOIN side_path_item_state s ON s.item_id = i.id
     WHERE st.side_path_id = $1
     ORDER BY st.sort_order, i.sort_order, i.id`,
    [pathId],
  );

  const stages = stageRows.map((stage) => ({
    ...stage,
    items: itemRows.filter((item) => item.stageId === stage.id),
  }));
  const completedItems = itemRows.filter((item) => item.status === "COMPLETED").length;

  return {
    ...path,
    stages,
    completedItems,
    totalItems: itemRows.length,
  };
}

export async function setSidePathItemState(
  itemId: number,
  status: SidePathItemStatus,
  note: string,
): Promise<void> {
  const db = await getDatabase();
  const timestamp = nowIso();
  await db.execute(
    `INSERT INTO side_path_item_state
       (item_id, status, note, started_at, completed_at)
     VALUES ($1, $2, $3,
       CASE WHEN $2 = 'NOT_STARTED' THEN NULL ELSE $4 END,
       CASE WHEN $2 = 'COMPLETED' THEN $4 ELSE NULL END)
     ON CONFLICT(item_id) DO UPDATE SET
       status = excluded.status,
       note = excluded.note,
       started_at = CASE
         WHEN excluded.status = 'NOT_STARTED' THEN NULL
         ELSE COALESCE(side_path_item_state.started_at, excluded.started_at)
       END,
       completed_at = CASE
         WHEN excluded.status = 'COMPLETED' THEN excluded.completed_at
         ELSE NULL
       END`,
    [itemId, status, note.trim(), timestamp],
  );
}
