# Troubleshooting

This page covers common Windows development problems.

## Vite Reports `EBUSY`

The Vite development server must not watch Rust build output.

The Vite configuration ignores:

```text
**/src-tauri/**
```

Do not remove that ignore rule.

## Rust Reports `link.exe` Access Denied

Reduce Cargo parallel work:

```powershell
$env:CARGO_BUILD_JOBS="1"
npm run tauri dev
```

If the failure continues, verify that Microsoft Visual Studio Build Tools can run `link.exe`.

Do not disable security software as a first troubleshooting step.

## Tauri Reports `icons/icon.ico` Not Found

The Windows build needs Tauri icon assets under:

```text
src-tauri/icons/
```

Regenerate the icon set from the approved Community Edition source icon when the assets are missing.

## Plan Import Reports `database is locked`

The Community Edition importer uses one Rust/SQLx transaction.

If the error appears on current source:

1. stop all running development application processes;
2. run `npm run verify`;
3. restart the application;
4. report the error with the current version and full log.

Do not replace the importer with separate `BEGIN`, `INSERT`, and `COMMIT` JavaScript SQL calls.

## CSS Imports Fail Type Checking

`tsconfig.app.json` includes `vite/client`.

Do not remove this type declaration when the application imports CSS from TypeScript.

## Verification Fails

Run each command separately:

```powershell
npm run typecheck
npm run lint
npm run test:run
npm run config:validate:example
npm run build
npm run visual:guard
npm run public:audit
```

Fix the first failure before you continue.
