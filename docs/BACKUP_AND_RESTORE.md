# Backup and Restore

Cracked Console can export mutable execution records to a JSON file.

The backup does not replace the original plan JSON.

## Backup Contents

A current backup can contain week mastery state, day state, block state, definition-of-done state, learning logs, timers, evidence, assessments, repair tasks, skill-level assignments, project progress, reading progress and reports, practice progress and logs, settings, and activity history.

Backup format v2 adds `user_week_state` so `NOT_STARTED`, `IN_PROGRESS`, and `PROVEN` week state can be restored with its linked proof assessment.

Existing format-v1 backups remain supported. Because v1 predates week mastery, restoring a v1 backup restores the older mutable records but does not recreate week-mastery rows that did not exist in that format.

## Export

Open **Settings**.

Select **Export backup**.

Choose a location outside the repository.

Keep more than one backup when the records matter to you.

## Inspect Before Restore

Select **Inspect backup for restore**.

Cracked Console shows the backup time, mutable row count, checksum status, and plan source SHA-256.

Do not restore a backup with an invalid checksum.

## Plan Identity

Restore compares the backup with the current imported plan.

The comparison includes source SHA-256, day count, week count, start date, and end date.

Restore fails when the plan identity does not match.

This means a backup from an old curriculum cannot be restored over a different replacement curriculum merely because both have the same number of weeks.

## Confirm Restore

Type:

```text
RESTORE
```

only after you verify the preview.

Restore replaces mutable local records in one database transaction.

## Before Main-Plan Replacement

Export a backup before using **Settings → Plan Replacement**.

Plan replacement is different from restore. It deliberately clears the current main curriculum so another plan can be imported while preserving the independent Reading and Practice/Photography tracks.
