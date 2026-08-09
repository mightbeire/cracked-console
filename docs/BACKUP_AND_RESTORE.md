# Backup and Restore

Cracked Console can export mutable execution records to a JSON file.

The backup does not replace the original plan JSON.

## Backup Contents

A backup can contain day state, block state, definition-of-done state, learning logs, timers, evidence, assessments, repair tasks, skill-level assignments, project progress, reading progress and reports, practice progress and logs, settings, and activity history.

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

## Confirm Restore

Type:

```text
RESTORE
```

only after you verify the preview.

Restore replaces mutable local records in one database transaction.
