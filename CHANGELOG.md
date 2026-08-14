# Changelog

## Unreleased — Weekly Mastery and Self-Paced Paths

### Added

- `This Week` execution surface above the existing day/block workflow;
- optional schema-v1 weekly-driver contracts through reserved non-required `WEEK_*` blocks;
- persistent week mastery states: `NOT_STARTED`, `IN_PROGRESS`, and `PROVEN`;
- week-level mastery gate requiring a passing independent assessment, verified week-linked evidence, and zero open repairs;
- `WEEKS PROVEN` as the primary curriculum progress metric for weekly-driver plans;
- explicit, confirmation-gated main-plan replacement in Settings;
- migration 7 for local week mastery state;
- configurable self-paced side paths with dynamic navigation, staged items, optional notes, and lightweight item state;
- migration 8 for side-path catalogs and local side-path item state;
- runtime and command-line validation for optional `sidePaths`;
- neutral `side-paths.example.json` fixture included in release checks;
- assessment-heading regression coverage;
- GitHub Actions release checks for typecheck, lint, tests, configuration validation, build, visual guard, public-release audit, and locked Rust/Tauri compilation.

### Changed

- user-facing `Today` navigation is now `This Week`; the internal `today` section identifier remains unchanged for settings and backup compatibility;
- assessment discovery now requires whole words such as `PROOF`, `EXAM`, `DEFENCE`, or `CHECK` instead of unsafe substring matches;
- daily completion is treated as execution telemetry rather than automatic mastery;
- backup format v2 includes week mastery while retaining restore support for format-v1 backups;
- backup format v3 includes self-paced side-path item state while retaining restore support for formats v1 and v2;
- the formal JSON schema now accepts optional self-paced side paths.

### Preserved

- local-first operation;
- ordinary schema-v1 plans;
- Proof, Evidence, Projects, Skills, backup/restore, and data-health semantics;
- Reading during main-plan replacement;
- Practice/Photography curriculum, progress, reports, lessons, preferences, and logs during main-plan replacement;
- self-paced side-path catalogs, progress, and notes during main-plan replacement;
- grayscale interface rules and no-XP/no-streak philosophy.

## 1.0.0

Initial Community Edition.

### Added

- user-owned JSON learning plans;
- local SQLite persistence;
- Today execution;
- curriculum browsing and search;
- assessment attempts and repair work;
- evidence records;
- project milestones;
- L0-L4 skill records;
- optional reading;
- optional practice;
- factual progress;
- local backup and restore;
- data-health checks;
- Windows desktop shell with Tauri.

### Design

- local-first core use;
- no required account;
- no required hosted backend;
- no required API key;
- no mandatory AI service;
- no XP or streaks;
- user-owned configuration and execution records.
