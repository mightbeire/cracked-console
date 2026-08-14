PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_week_state (
  week_id INTEGER PRIMARY KEY REFERENCES curriculum_weeks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED'
    CHECK(status IN('NOT_STARTED','IN_PROGRESS','PROVEN')),
  started_at TEXT,
  proven_at TEXT,
  proof_assessment_id INTEGER REFERENCES assessments(id) ON DELETE SET NULL,
  CHECK(
    (status = 'PROVEN' AND proven_at IS NOT NULL AND proof_assessment_id IS NOT NULL)
    OR status <> 'PROVEN'
  )
);

CREATE INDEX IF NOT EXISTS idx_user_week_state_status
  ON user_week_state(status);
