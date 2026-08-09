# Setup

This guide explains how to run Cracked Console Community Edition on Windows.

## Requirements

Install:

- Node.js 22 or later;
- Rust with Rustup;
- Microsoft Visual Studio Build Tools with the Desktop development with C++ workload;
- Microsoft Edge WebView2 Runtime;
- Git if you want to contribute.

## 1. Install Dependencies

Open PowerShell in the repository root.

Run:

```powershell
npm install
```

Keep `package-lock.json` in Git. It records the tested JavaScript dependency tree.

## 2. Verify the Source

Run:

```powershell
npm run public:audit
npm run verify
```

Both commands must pass.

## 3. Create Your Plan

Copy:

```text
examples/starter-plan.example.json
```

to:

```text
user-config/plan.json
```

Git ignores personal files inside `user-config/`.

Edit the copy. Use [docs/CONFIGURATION.md](docs/CONFIGURATION.md) as the field reference.

## 4. Validate Your Plan

Run:

```powershell
npm run config:validate -- user-config/plan.json
```

Fix every reported issue.

## 5. Start Cracked Console

Run:

```powershell
npm run tauri dev
```

Choose your plan JSON file.

Review the import preview.

Import the plan only when the preview matches your intended schedule.

## 6. Build the Application

Run:

```powershell
npm run tauri build
```

Tauri writes build output under `src-tauri/target/`.

Git ignores that directory.

## Development Day Override

Development builds can open a configured day without changing the real calendar.

```powershell
$env:VITE_CRACKED_DAY_OVERRIDE="1"
npm run tauri dev
```

Remove the override after the test:

```powershell
Remove-Item Env:VITE_CRACKED_DAY_OVERRIDE -ErrorAction SilentlyContinue
```

The override is for development only.

## Local Data

Cracked Console stores imported plan data and execution records in a local SQLite database.

Do not commit local databases, backups, or personal plan files.

Use **Settings → Export backup** for portable execution records.
