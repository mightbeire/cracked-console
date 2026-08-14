# Cracked Console

Cracked Console is a local-first desktop application for structured, self-directed learning.

You define the learning plan. Cracked Console provides execution, proof, evidence, review, and optional self-paced exploration systems.

The Community Edition does not include a prescribed curriculum. Core use does not require an account, hosted database, API key, or mandatory AI service. Your plan and execution records stay on your computer.

## What It Does

- **This Week:** See the current weekly driver, mastery state, and today's execution work.
- **Curriculum:** Browse and search the imported main plan.
- **Proof:** Record assessment attempts and repair work.
- **Projects:** Complete project milestones with evidence.
- **Skills:** Assign L0-L4 levels from evidence.
- **Evidence:** Store proof of work.
- **Reading:** Run an optional reading track.
- **Practice:** Run an optional practical learning track.
- **Self-paced paths:** Add independent curiosity lanes with their own stages, resources, notes, and lightweight progress. They create no calendar debt or mastery requirement.
- **Guide:** Search the local operating manual.
- **Progress:** Review factual progress, including proven weeks when the plan uses weekly mastery.
- **Settings:** Manage startup behavior, backups, explicit main-plan replacement, restore, and data health.

## Weekly Drivers

Ordinary schema-v1 plans remain valid.

A plan can optionally define a weekly learning contract with non-required `WEEK_*` blocks. Cracked Console renders those contract sections in **This Week** while preserving the normal day/block execution model underneath.

A V3-style week is `NOT_STARTED`, `IN_PROGRESS`, or `PROVEN`.

`PROVEN` requires:

- a passing independent assessment linked to the week;
- at least one verified evidence item linked to the week;
- zero open repair work linked to the week.

Completing days or consuming resources does not automatically prove mastery.

## Self-Paced Side Paths

A plan can optionally define `sidePaths` for subjects that deserve their own section but should not become scheduled curriculum work.

Each configured path appears in navigation and can contain ordered stages and items such as videos, books, films, podcasts, courses, or other user-defined resources. Item state is limited to `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`, with an optional local note.

Side paths never create Learning Debt, streak pressure, required weekly proof, or calendar deadlines. Main-plan replacement preserves their catalog and local state.

See [Configuration](docs/CONFIGURATION.md) for both weekly-driver and side-path formats.

## Local-First Design

Cracked Console uses a local SQLite database.

Core use does not require a user account, cloud storage, a hosted backend, an API key, or an AI subscription.

You can export a JSON backup of mutable execution records. Current backups include week mastery and self-paced path state. Restore validates the checksum and imported plan identity before it replaces local state.

## Bring Your Own Plan

The repository includes neutral examples:

```text
examples/starter-plan.example.json
examples/weekly-driver.example.json
examples/side-paths.example.json
```

Copy the closest example to:

```text
user-config/plan.json
```

Then replace the example content with your own plan.

Validate the file:

```powershell
npm run config:validate -- user-config/plan.json
```

The desktop application validates the file again before import.

Normal import does not overwrite an active main plan. If you intentionally need to replace the main curriculum, export a backup first and use **Plan Replacement** in Settings. Reading, Practice, and self-paced side paths are preserved by that operation.

## Technology

Cracked Console uses Tauri 2, React, TypeScript, Vite, SQLite, and Rust.

## Quick Start

See [SETUP.md](SETUP.md) for the full Windows setup.

```powershell
npm install
npm run public:audit
npm run verify
npm run tauri dev
```

On first run, choose your plan JSON file and review the import preview.

## Documentation

- [Setup](SETUP.md)
- [User Guide](GUIDE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Backup and Restore](docs/BACKUP_AND_RESTORE.md)
- [Privacy](docs/PRIVACY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Documentation Style](docs/DOCUMENTATION_STYLE.md)

## Release Checks

Before a public release, run:

```powershell
npm run public:audit
npm run verify
```

Do not publish a repository that fails either command.

## License

Cracked Console is available under the [MIT License](LICENSE).
