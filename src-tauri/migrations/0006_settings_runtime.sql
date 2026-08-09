PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO app_settings(key,value,updated_at) VALUES('startup_section','today',CURRENT_TIMESTAMP),('backup_reminder_days','14',CURRENT_TIMESTAMP),('last_backup_at','',CURRENT_TIMESTAMP),('last_restore_at','',CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS runtime_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO runtime_meta(key,value,updated_at) VALUES('schema_release','community-0.2',CURRENT_TIMESTAMP),('last_clean_boot_at','',CURRENT_TIMESTAMP),('last_timer_recovery_at','',CURRENT_TIMESTAMP);
