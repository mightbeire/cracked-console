# Architecture

Cracked Console is a local-first Windows desktop application.

## Interface

React and TypeScript render This Week, Curriculum, Proof, Projects, Skills, Evidence, Reading, Practice, Guide, Progress, and Settings.

The internal section identifier for `This Week` remains `today` so existing settings and backups do not break merely because the user-facing execution model changed.

## Domain

Domain modules contain rules for execution, week mastery, assessments, repair work, evidence, projects, skills, reading, practice, and progress.

Keep domain rules separate from presentation code when practical.

## Plan Configuration

A user-owned JSON file defines the plan.

The configuration can define weeks, days, rest days, work blocks, resources, skills, projects, reading, and practice.

Schema v1 also supports an optional weekly-driver convention through reserved non-required `WEEK_` block types. The weekly view reads those contract blocks across the configured week without requiring a second personal-plan format.

The application validates the configuration before import.

## Weekly Mastery

`curriculum_weeks` remains immutable imported plan data.

Migration 7 adds mutable `user_week_state` with:

```text
NOT_STARTED
IN_PROGRESS
PROVEN
```

`PROVEN` is evidence-based. The application requires:

- a passing independent assessment linked to the week;
- at least one verified evidence item linked to the week;
- no open repair work linked to the week.

Completed days and blocks do not automatically prove a week.

The existing Proof system remains the assessment authority. A V3-style plan uses one active `WEEK_MASTERY_PROOF` block per week; assessment records already carry the source week number.

## Data

SQLite stores the imported plan and mutable execution records.

Plan data describes what the user intends to do.

Mutable records describe what the user actually did or proved.

Week mastery, daily execution, assessments, evidence, and repairs are separate facts so one cannot silently substitute for another.

## Plan Replacement Boundary

Normal import still refuses to overwrite an active plan.

Settings provides an explicit main-plan replacement operation. That operation:

1. detaches old assessments and evidence from old day/week numbers;
2. closes unresolved old-plan repair tasks;
3. removes the old main curriculum, skills catalog, and project catalog;
4. preserves Reading and Practice/Photography state;
5. preserves settings, activity history, and detached historical proof/evidence.

This is intentionally not a database wipe.

## Native Desktop Boundary

Tauri provides the Windows desktop shell.

Rust provides native functions that need one stable operating-system or database boundary.

Examples include local file reads and writes, transaction-safe configuration import, transaction-safe backup restore, and Windows packaging.

## Local-First Rule

Core use must work without a hosted backend.

An optional integration must not become a requirement for normal execution.

## Transaction Rule

Configuration import, plan replacement, and backup restore can change many related rows.

These operations run through one Rust/SQLx transaction on one SQLite connection when they span related data.

Do not implement a multi-statement transaction by sending unrelated JavaScript SQL-plugin calls one at a time.

## Evidence Rule

Completion and mastery are different concepts.

A completed task can support a skill claim. It does not automatically prove a skill level or a week.

## Backup Rule

Restore validates format version, checksum, and imported plan identity before it changes mutable state.
