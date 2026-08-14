# User Guide

Cracked Console separates configuration, execution, proof, review, and optional self-paced exploration.

## First Run

Choose a valid plan JSON file.

Cracked Console validates the file and shows an import preview. Check the title, dates, week count, day count, skills, projects, reading, practice, and self-paced path counts before import.

## This Week

Use **This Week** for the current configured week and today's execution work.

A plan can use the ordinary schema-v1 day model or add an optional weekly-driver contract with non-required `WEEK_*` blocks.

Weekly contract sections explain the outcome, prerequisites, learning path, lab/build work, retrieval, evidence, and later review expectations. Reading a contract section is not mastery evidence.

A V3-style week has three mastery states:

- `NOT_STARTED`;
- `IN_PROGRESS`;
- `PROVEN`.

A week can become `PROVEN` only when it has a passing independent assessment linked to that week, at least one verified week-linked evidence item, and zero open repair tasks linked to that week.

Completed days and watched resources do not prove a week.

## Curriculum

Use **Curriculum** to review the imported main plan. Curriculum browsing does not change execution records.

## Proof and Learning Debt

Use **Proof** for assessment work.

Cracked Console detects assessment blocks that use whole assessment words such as Proof, Exam, Defence, or Check. Ordinary substrings such as `example` are not assessment headings.

The default pass floor is 70 percent. A failed attempt can create repair work. A retest creates a new attempt and does not overwrite the earlier attempt.

Learning Debt is unresolved repair work that came from evidence of a learning gap. It is not a score or punishment.

## Evidence, Projects, and Skills

Use **Evidence** to store useful proof of work. Verification matters more than the number of records.

Projects require milestone evidence and their configured defence condition. Skills use L0-L4 evidence-based levels; time alone does not raise a skill level.

## Reading

Reading is optional and independent of main-plan replacement. Reading completion does not automatically change a skill level.

## Practice

Practice is optional, self-paced, and independent of main-plan replacement. Use its lessons, logs, reviews, and preferences without tying them to the main calendar.

## Self-Paced Side Paths

A configured self-paced path appears as its own top-level navigation item.

Use these paths for subjects you want available on demand without turning them into scheduled obligations.

Each path contains ordered stages and items. An item can include a resource link, an optional note, and one of three lightweight states:

- `NOT_STARTED`;
- `IN_PROGRESS`;
- `COMPLETED`.

These states are descriptive only. Side paths do not create Learning Debt, streaks, deadlines, required weekly work, or mastery evidence.

A main-plan replacement preserves side-path catalogs, notes, and item state.

## Progress

For weekly-driver plans, **weeks proven** is the primary curriculum-progress metric. Daily completion, required blocks, tracked work time, assessments, repair work, evidence, projects, reading, practice, and skills remain supporting facts.

Self-paced path completion is intentionally separate from main-curriculum progress.

## Backup

Use **Settings → Export backup** to create a JSON backup.

Current backup format v3 contains mutable execution records, week mastery, self-paced path item state/notes, a checksum, and imported-plan identity. Older v1/v2 backups remain supported.

## Replace the Main Plan

Normal import refuses to overwrite an active plan.

When you intentionally need a new main curriculum:

1. export a backup;
2. open **Settings → Plan Replacement**;
3. review the preservation notice;
4. type `RESET PLAN`;
5. reset the imported main plan;
6. import the replacement plan through Setup.

The reset clears the old main curriculum and its execution/skills/project catalogs. It keeps Reading, Practice/Photography, and self-paced side paths intact. Historical assessments and evidence remain local but are detached from old day/week numbers so they cannot prove the replacement plan.

## Restore

Inspect the backup before restore. The checksum must be valid and the backup must match the currently imported main plan. Type `RESTORE` only after you review the preview.

## Data Health

Use **Settings → Run check**.

The check reports SQLite integrity, foreign-key issues, plan day and week counts, mutable row count, and source SHA-256. Do not ignore a failed integrity or foreign-key check.
