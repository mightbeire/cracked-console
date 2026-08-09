# Security

## Supported Version

Security fixes target the latest public release.

## Report a Vulnerability

Do not publish a security vulnerability in a public issue before the maintainers can review it.

Use GitHub private vulnerability reporting when the repository enables it.

If private vulnerability reporting is not available, use the maintainer contact method listed on the repository profile.

## Secrets

Core Cracked Console use does not require API keys.

Do not commit secrets when you add optional integrations.

Keep API keys, access tokens, passwords, private keys, local databases, backup files, and personal configuration outside Git.

Run:

```powershell
npm run public:audit
```

This local audit reduces accidental exposure risk. It does not replace GitHub secret scanning or code review.

## Local Data

Cracked Console is local first.

Protect access to the Windows account and device that store the local database and backups.

A local-first application cannot protect data from a person who already controls the operating-system account.

## Dependencies

Review dependency changes carefully.

Do not add a dependency when the current stack or platform already provides the required function.

Keep the lock file in version control.
