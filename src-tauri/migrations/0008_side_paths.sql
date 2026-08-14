CREATE TABLE IF NOT EXISTS side_paths (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS side_path_stages (
  id INTEGER PRIMARY KEY,
  side_path_id INTEGER NOT NULL REFERENCES side_paths(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS side_path_items (
  id INTEGER PRIMARY KEY,
  stage_id INTEGER NOT NULL REFERENCES side_path_stages(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  creator TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT '',
  resource_url TEXT
);

CREATE TABLE IF NOT EXISTS side_path_item_state (
  item_id INTEGER PRIMARY KEY REFERENCES side_path_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK(status IN ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
  note TEXT NOT NULL DEFAULT '',
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_side_path_stages_path ON side_path_stages(side_path_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_side_path_items_stage ON side_path_items(stage_id, sort_order);
