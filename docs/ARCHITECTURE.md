# Architecture

Cracked Console is a local-first Windows desktop application.

## Interface

React and TypeScript render This Week, Curriculum, Proof, Projects, Skills, Evidence, Reading, Practice, configured self-paced paths, Guide, Progress, and Settings.

The internal section identifier for `This Week` remains `today` so existing settings and backups do not break merely because the user-facing execution model changed.

Self-paced path navigation is dynamic. The public engine does not hardcode personal path names or content.

`This Week` can also render a plan-owned Teacher Shelf. The public engine owns only the generic card renderer; personal teachers, URLs, segments, notices, and assignments remain inside user-owned configuration.

## Domain

Domain modules contain rules for execution, week mastery, assessments, repair work, evidence, projects, skills, reading, practice, self-paced paths, weekly teaching resources, and progress.

Keep domain rules separate from presentation code when practical.

## Plan Configuration

A user-owned JSON file defines the plan.

The configuration can define weeks, days, rest days, work blocks, resources, skills, projects, reading, practice, and optional self-paced side paths.

Schema v1 supports an optional weekly-driver convention through reserved non-required `WEEK_` block types. The weekly view reads those contract blocks across the configured week without requiring a second personal-plan format.

Teacher Shelf entries use a narrower reserved convention: `WEEK_RESOURCE_*`. They remain ordinary immutable `curriculum_blocks` in SQLite, but the weekly view excludes them from contract prose and parses their JSON metadata into resource cards. This avoids a parallel resource database while preserving plan-level ownership of exact teaching assignments.

Teacher Shelf blocks are non-required metadata and do not participate in day completion, week proof, timers, or Learning Debt.

`sidePaths` uses a separate non-calendar hierarchy: path → stage → item. It is validated before import and stored independently from curriculum weeks and days.

## Weekly Mastery

`curriculum_weeks` remains immutable imported plan data.

Migration 7 adds mutable `user_week_state` with:

```text
NOT_STARTED
IN_PROGRESS
PROVEN
```

`PROVEN` requires a passing independent assessment linked to the week, at least one verified week-linked evidence item, and no open repair work linked to the week.

Completed days, blocks, or teaching resources do not automatically prove a week.

The existing Proof system remains the assessment authority. A V3-style plan uses one active `WEEK_MASTERY_PROOF` block per week; assessment records already carry the source week number.

## Self-Paced Paths

Migration 8 adds:

```text
side_paths
side_path_stages
side_path_items
side_path_item_state
```

Path, stage, and item rows are imported catalog data. `side_path_item_state` is mutable local data containing lightweight status and notes.

Self-paced paths deliberately have no curriculum dates, timers, Definition of Done, weekly proof, Learning Debt, or skill-level side effects.

If side paths already exist locally, a later main-plan import does not overwrite them. Main-plan replacement preserves the catalogs and state.

## Data

SQLite stores imported configuration and mutable local records.

Plan data describes what the user intends to do. Mutable records describe what the user actually did or proved.

Week mastery, daily execution, assessments, evidence, repairs, reading/practice progress, and self-paced path state remain separate facts so one cannot silently substitute for another.

Teacher Shelf metadata is immutable curriculum data. Opening a resource produces no automatic progress record.

## Plan Replacement Boundary

Normal import still refuses to overwrite an active main plan.

Settings provides an explicit main-plan replacement operation. That operation:

1. detaches old assessments and evidence from old day/week numbers;
2. closes unresolved old-plan repair tasks;
3. removes the old main curriculum, skills catalog, and project catalog;
4. preserves Reading, Practice/Photography, and self-paced path catalogs/state;
5. preserves settings, activity history, and detached historical proof/evidence.

Because Teacher Shelf entries belong to the main curriculum, replacing a main plan replaces its weekly teaching-resource metadata with the new plan's shelf.

This is intentionally not a database wipe.

## Native Desktop Boundary

Tauri provides the Windows desktop shell.

Rust provides native functions that need one stable operating-system or database boundary, including local file reads/writes and transaction-safe database operations.

External Teacher Shelf and side-path URLs open through the existing Tauri opener boundary rather than navigating the application WebView away from Cracked Console.

## Local-First Rule

Core use must work without a hosted backend. An optional integration must not become a requirement for normal execution.

## Transaction Rule

Configuration import, plan replacement, and backup restore can change many related rows. These operations run through one Rust/SQLx transaction on one SQLite connection when they span related data.

## Evidence Rule

Completion and mastery are different concepts. A completed task can support a skill claim; it does not automatically prove a skill level or a week.

Opening, watching, or reading a Teacher Shelf resource is not evidence by itself.

Self-paced path completion is curiosity-tracking only and is not mastery evidence for the main curriculum.

## Backup Rule

Restore validates format version, checksum, and imported plan identity before it changes mutable state.

Backup format v3 includes `side_path_item_state` while maintaining compatibility with v1 and v2 backups.
