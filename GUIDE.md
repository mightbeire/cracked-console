# User Guide

Cracked Console separates configuration, execution, proof, and review.

## First Run

Choose a valid plan JSON file.

Cracked Console validates the file and shows an import preview.

Check the title, dates, week count, day count, skills, projects, reading, and practice data.

Import the plan only when the preview is correct.

## This Week

Use **This Week** for the current configured week and today's execution work.

A plan can use the ordinary schema-v1 day model or add an optional weekly-driver contract with non-required `WEEK_*` blocks.

Weekly contract sections explain the outcome, prerequisites, learning path, lab/build work, retrieval, evidence, and later review expectations. Reading a contract section is not mastery evidence.

A V3-style week has three mastery states:

- `NOT_STARTED`;
- `IN_PROGRESS`;
- `PROVEN`.

A week can become `PROVEN` only when it has:

- a passing independent assessment linked to that week;
- at least one verified evidence item linked to that week;
- zero open repair tasks linked to that week.

Completed days and watched resources do not prove a week.

The current day remains available underneath the weekly contract for timers, execution blocks, notes, Definition of Done items, and the learning log.

A rest day does not create forced work.

## Curriculum

Use **Curriculum** to review the imported plan.

Search can find days, weeks, block types, block labels, instructions, and resources.

Curriculum browsing does not change execution records.

## Proof

Use **Proof** for assessment work.

Cracked Console detects assessment blocks that use whole assessment words such as Proof, Exam, Defence, or Check. Ordinary substrings such as `example` are not assessment headings.

The default pass floor is 70 percent.

A failed attempt can create repair work.

A retest creates a new attempt. It does not overwrite the earlier attempt.

For a weekly-driver plan, the passing attempt must be independent before it can satisfy the week mastery gate.

## Learning Debt

Learning Debt is unresolved repair work that came from evidence of a learning gap.

It is not a score or punishment.

Resolve the gap, then use a new assessment attempt when you are ready.

## Evidence

Use **Evidence** to store useful proof of work.

Evidence can include text, a URL, a repository reference, a file reference, a score, a reflection, or a verifier result.

Verification matters more than the number of evidence records.

A weekly-driver plan needs at least one verified week-linked evidence item before the week can become `PROVEN`.

## Projects

Projects come from the imported plan.

Complete a milestone only when you can link evidence to it.

A project also needs its configured passing defence condition before automatic completion.

## Skills

Skills come from the imported plan.

Levels range from L0 to L4.

Time alone does not raise a skill level.

Higher levels need stronger, repeated, and integrated evidence.

## Reading

Reading is optional and independent of main-plan replacement.

A completed reading item requires the full report.

The imported reading catalog defines each reading item and written assignment.

Reading completion does not automatically change a skill level.

## Practice

Practice is optional, self-paced, and independent of main-plan replacement.

A lesson completes when you record learning, practice, review, and explanation of representative work.

Use the practice log for sessions and reflections.

A plan replacement does not clear existing Practice/Photography curriculum, progress, reports, lessons, preferences, or logs.

## Progress

Progress reports recorded facts.

For weekly-driver plans, **weeks proven** is the primary curriculum-progress metric.

Daily completion, required blocks, tracked work time, assessments, repair work, evidence, projects, reading, practice, and skill levels remain visible as supporting facts.

It does not use XP or streaks.

## Backup

Use **Settings → Export backup** to create a JSON backup.

The backup contains mutable execution records, a checksum, and the imported plan identity.

## Replace the Main Plan

Normal import refuses to overwrite an active plan.

When you intentionally need a new main curriculum:

1. export a backup;
2. open **Settings → Plan Replacement**;
3. review the preservation notice;
4. type `RESET PLAN`;
5. reset the imported main plan;
6. import the replacement plan through Setup.

The reset clears the old main curriculum and its execution/skills/project catalogs. It keeps Reading and Practice/Photography intact. Historical assessments and evidence remain local but are detached from old day/week numbers so they cannot prove the replacement plan.

## Restore

Inspect the backup before restore.

The checksum must be valid.

The backup must match the currently imported plan.

Type `RESTORE` only after you review the preview.

## Data Health

Use **Settings → Run check**.

The check reports SQLite integrity, foreign-key issues, plan day and week counts, mutable row count, and source SHA-256.

Do not ignore a failed integrity or foreign-key check.
