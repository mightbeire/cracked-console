# Configuration

Cracked Console Community Edition uses one user-owned JSON file.

The public repository does not include the maintainer's personal learning plan.

## Start from the Example

Copy:

```text
examples/starter-plan.example.json
```

to:

```text
user-config/plan.json
```

Then edit the copy.

## Top-Level Structure

The file has these top-level fields:

```text
schemaVersion
plan
skills
projects
reading
practice
```

`reading` and `practice` are optional.

## Schema Version

Use:

```json
"schemaVersion": 1
```

The validator rejects unsupported schema versions.

## Plan

`plan` defines the calendar and daily work.

Required fields are:

- `version`;
- `title`;
- `startDate`;
- `weeks`.

Every plan date must be contiguous. If one calendar day has no work, include that date as a rest day.

The first day must match `startDate`.

## Weeks

Each week needs a title and at least one day.

Optional fields are:

- `phase`;
- `consolidation`.

The application calculates the final day number from the order of the days.

## Days

Each day needs:

- `date`;
- `rest`;
- `blocks`;
- `definitionOfDone`.

An active day needs at least one block.

A rest day can have an empty block list and an empty definition-of-done list.

## Blocks

A block needs:

- `type`;
- `label`;
- `plannedMinutes`;
- `instructions`;
- `required`.

Use an uppercase identifier for `type`.

Examples are:

```text
FOCUS
BUILD
REVIEW
LANGUAGE
```

The type is user-defined. The public engine does not require a fixed list.

## Skills

`skills` is an array.

Each skill needs:

- `code`;
- `name`;
- `family`.

Codes and names must be unique.

## Projects

Each project needs:

- `code`;
- `name`;
- `coreIntegration`;
- `startDay`;
- `endDay`;
- `defenceAssessmentType`;
- at least one milestone.

Project day numbers must exist in the plan.

## Reading

Reading is optional.

A reading month defines:

- title;
- start date;
- end date;
- required book count.

A reading book defines:

- month reference or `null`;
- slot;
- title;
- author;
- optional short-read flag;
- optional bonus flag;
- optional reread flag;
- written assignment.

## Practice

Practice is optional.

Use it for a self-paced practical track.

A stage defines a goal and one or more lessons.

A later stage can use `unlockAfterStage` to depend on an earlier stage.

A lesson defines:

- title;
- concept;
- practice assignment;
- review prompts;
- optional resource links.

The practice model is generic. It is not limited to one subject.

## JSON Schema

The repository includes:

```text
config/community-plan.schema.json
```

An editor can use this file for field completion and structural checks.

The command-line validator also checks relationships that JSON Schema cannot express easily, such as contiguous dates and valid project day references.

## Validate Before Import

Run:

```powershell
npm run config:validate -- user-config/plan.json
```

Do not import a file that fails validation.

## Secrets

Do not put secrets in the configuration.

Do not add:

- API keys;
- tokens;
- passwords;
- private keys.

Core Cracked Console use does not require them.
