# User Guide

Cracked Console separates configuration, execution, proof, and review.

## First Run

Choose a valid plan JSON file.

Cracked Console validates the file and shows an import preview.

Check the title, dates, week count, day count, skills, projects, reading, and practice data.

Import the plan only when the preview is correct.

## Today

Use **Today** for the current configured day.

Start a timer when you begin a work block.

Mark the block complete when the required work is complete.

Use the block note for useful context.

If the plan defines a `LOG` or `LEARNING_LOG` block, complete the learning log before you finish the day.

A rest day does not create forced work.

## Curriculum

Use **Curriculum** to review the imported plan.

Search can find days, weeks, block types, block labels, instructions, and resources.

Curriculum browsing does not change execution records.

## Proof

Use **Proof** for assessment work.

Cracked Console can detect assessment blocks whose label or instructions contain terms such as Proof, Exam, Defence, or Check.

The default pass floor is 70 percent.

A failed attempt can create repair work.

A retest creates a new attempt. It does not overwrite the earlier attempt.

## Learning Debt

Learning Debt is unresolved repair work that came from evidence of a learning gap.

It is not a score or punishment.

Resolve the gap, then use a new assessment attempt when you are ready.

## Evidence

Use **Evidence** to store useful proof of work.

Evidence can include text, a URL, a repository reference, a file reference, a score, a reflection, or a verifier result.

Verification matters more than the number of evidence records.

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

Reading is optional.

A completed reading item requires the full report.

The imported plan defines each reading item and written assignment.

Reading completion does not automatically change a skill level.

## Practice

Practice is optional and self-paced.

A lesson completes when you record learning, practice, review, and explanation of representative work.

Use the practice log for sessions and reflections.

## Progress

Progress reports recorded facts.

It includes active-day completion, required blocks, tracked work time, assessments, repair work, evidence, projects, reading, practice, and skill levels.

It does not use XP or streaks.

## Backup

Use **Settings → Export backup** to create a JSON backup.

The backup contains mutable execution records, a checksum, and the imported plan identity.

## Restore

Inspect the backup before restore.

The checksum must be valid.

The backup must match the currently imported plan.

Type `RESTORE` only after you review the preview.

## Data Health

Use **Settings → Run check**.

The check reports SQLite integrity, foreign-key issues, plan day and week counts, mutable row count, and source SHA-256.

Do not ignore a failed integrity or foreign-key check.
