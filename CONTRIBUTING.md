# Contributing

Contributions are welcome.

Keep changes small, testable, and easy to review.

## Before You Start

Read `README.md`, `docs/ARCHITECTURE.md`, `docs/DOCUMENTATION_STYLE.md`, and `SECURITY.md`.

Open an issue before you make a large architectural change.

## Development Rules

- Keep core use local first.
- Do not add a hosted service when the feature can work locally.
- Do not add mandatory AI services.
- Do not add accounts or cloud sync without a clear architectural reason.
- Do not add streaks, XP, or gamified mastery.
- Keep evidence rules explicit.
- Preserve user ownership of local data.
- Add tests for behavior that can fail silently.
- Keep the visual system grayscale and accessible.
- Keep the user plan separate from application code.

## Verification

Before you open a pull request, run:

```powershell
npm run public:audit
npm run verify
```

Both commands must pass.

## Documentation

All original Markdown documentation must use ASD-STE100 Simplified Technical English for clarity and the Chicago Manual of Style for editorial consistency.

Technical accuracy takes priority over forced simplification.

Do not rewrite standard legal text such as the MIT License.

## Pull Requests

A pull request should state:

1. what changed;
2. why the change is needed;
3. how you tested it;
4. what migration or data risk exists;
5. whether documentation changed.

Do not mix unrelated changes in one pull request.

## Do Not Commit

Do not commit API keys, access tokens, passwords, private keys, `.env` files, local databases, backup files, personal plan files, or generated build output.
