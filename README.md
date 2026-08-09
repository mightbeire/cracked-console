# Cracked Console

Cracked Console is a local-first desktop application for structured, self-directed learning.

You define the learning plan. Cracked Console provides the execution system.

The Community Edition does not include a prescribed curriculum. Core use does not require an account, hosted database, API key, or mandatory AI service. Your plan and execution records stay on your computer.

## What It Does

- **Today:** Execute the current plan day.
- **Curriculum:** Browse and search the imported plan.
- **Proof:** Record assessment attempts and repair work.
- **Projects:** Complete project milestones with evidence.
- **Skills:** Assign L0-L4 levels from evidence.
- **Evidence:** Store proof of work.
- **Reading:** Run an optional reading track.
- **Practice:** Run an optional practical learning track.
- **Guide:** Search the local operating manual.
- **Progress:** Review factual progress.
- **Settings:** Manage startup behavior, backups, restore, and data health.

## Local-First Design

Cracked Console uses a local SQLite database.

Core use does not require a user account, cloud storage, a hosted backend, an API key, or an AI subscription.

You can export a JSON backup of mutable execution records. Restore validates the backup checksum and imported plan identity before it replaces local state.

## Bring Your Own Plan

The repository includes a neutral example:

```text
examples/starter-plan.example.json
```

Copy it to:

```text
user-config/plan.json
```

Then replace the example content with your own plan.

Validate the file:

```powershell
npm run config:validate -- user-config/plan.json
```

The desktop application validates the file again before import.

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
