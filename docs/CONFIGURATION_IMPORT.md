# Configuration Import

Stage 3 imports one validated plan into an empty local database.

## Import Sequence

The application performs these steps:

1. Open the JSON file with a native file picker.
2. Read the file locally.
3. Parse the JSON.
4. Validate the configuration.
5. Show an import summary.
6. Compute a SHA-256 hash of the source JSON.
7. Start a SQLite transaction.
8. Insert plan and optional track data.
9. Commit the transaction.

If an insert fails, the transaction rolls back.

## Source Identity

The application stores:

- source file name;
- plan version;
- SHA-256 source hash;
- import time;
- start and end dates;
- day and week counts.

The source hash identifies the imported plan.

## Replacement

Stage 3 does not replace an existing plan.

This restriction prevents accidental loss while the Community Edition import boundary is new.

A later stage can add explicit replacement or version migration after tests cover execution-history safety.
