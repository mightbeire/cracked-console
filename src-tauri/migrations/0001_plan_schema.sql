PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS curriculum_versions (
 id INTEGER PRIMARY KEY, version TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 source_file_name TEXT NOT NULL, source_sha256 TEXT NOT NULL UNIQUE, imported_at TEXT NOT NULL,
 day_count INTEGER NOT NULL CHECK(day_count>=1), week_count INTEGER NOT NULL CHECK(week_count>=1),
 start_date TEXT NOT NULL, end_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS curriculum_weeks (
 id INTEGER PRIMARY KEY, curriculum_version_id INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
 week_number INTEGER NOT NULL CHECK(week_number>=1), first_day INTEGER NOT NULL CHECK(first_day>=1),
 last_day INTEGER NOT NULL CHECK(last_day>=first_day), date_range_label TEXT NOT NULL, title TEXT NOT NULL,
 phase_number INTEGER NOT NULL DEFAULT 1 CHECK(phase_number>=1), is_consolidation INTEGER NOT NULL DEFAULT 0 CHECK(is_consolidation IN(0,1)),
 UNIQUE(curriculum_version_id,week_number)
);
CREATE TABLE IF NOT EXISTS curriculum_days (
 id INTEGER PRIMARY KEY, curriculum_version_id INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
 week_id INTEGER NOT NULL REFERENCES curriculum_weeks(id) ON DELETE RESTRICT, day_number INTEGER NOT NULL CHECK(day_number>=1),
 date TEXT NOT NULL, date_label TEXT NOT NULL, phase_number INTEGER NOT NULL DEFAULT 1 CHECK(phase_number>=1),
 is_rest_day INTEGER NOT NULL CHECK(is_rest_day IN(0,1)), source_text TEXT NOT NULL DEFAULT '',
 UNIQUE(curriculum_version_id,day_number), UNIQUE(curriculum_version_id,date)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_days_week ON curriculum_days(week_id,day_number);
CREATE INDEX IF NOT EXISTS idx_curriculum_days_date ON curriculum_days(date);
CREATE TABLE IF NOT EXISTS curriculum_blocks (
 id INTEGER PRIMARY KEY, day_id INTEGER NOT NULL REFERENCES curriculum_days(id) ON DELETE CASCADE,
 block_type TEXT NOT NULL, sort_order INTEGER NOT NULL CHECK(sort_order>=1), label TEXT NOT NULL,
 planned_minutes INTEGER NOT NULL CHECK(planned_minutes>=0), instructions_markdown TEXT NOT NULL,
 is_required INTEGER NOT NULL CHECK(is_required IN(0,1)), UNIQUE(day_id,sort_order)
);
CREATE TABLE IF NOT EXISTS curriculum_resources (
 id INTEGER PRIMARY KEY, curriculum_version_id INTEGER NOT NULL REFERENCES curriculum_versions(id) ON DELETE CASCADE,
 label TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(curriculum_version_id,url)
);
CREATE TABLE IF NOT EXISTS definition_of_done_items (
 id INTEGER PRIMARY KEY, day_id INTEGER NOT NULL REFERENCES curriculum_days(id) ON DELETE CASCADE,
 sort_order INTEGER NOT NULL CHECK(sort_order>=1), text TEXT NOT NULL, is_required INTEGER NOT NULL CHECK(is_required IN(0,1)), UNIQUE(day_id,sort_order)
);
CREATE TABLE IF NOT EXISTS curriculum_tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, UNIQUE(name,type));
CREATE TABLE IF NOT EXISTS curriculum_day_tags (day_id INTEGER NOT NULL REFERENCES curriculum_days(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES curriculum_tags(id) ON DELETE CASCADE, PRIMARY KEY(day_id,tag_id));
CREATE TABLE IF NOT EXISTS curriculum_block_tags (block_id INTEGER NOT NULL REFERENCES curriculum_blocks(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES curriculum_tags(id) ON DELETE CASCADE, PRIMARY KEY(block_id,tag_id));
