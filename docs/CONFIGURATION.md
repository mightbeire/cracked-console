# Configuration

Cracked Console Community Edition uses one user-owned JSON file.

The public repository does not include the maintainer's personal learning plan.

## Start from an Example

Use one of the neutral examples:

```text
examples/starter-plan.example.json
examples/weekly-driver.example.json
examples/side-paths.example.json
```

Copy the closest example to:

```text
user-config/plan.json
```

Then edit the copy.

## Top-Level Structure

The file can contain:

```text
schemaVersion
plan
skills
projects
reading
practice
sidePaths
```

`reading`, `practice`, and `sidePaths` are optional.

## Schema Version

Use:

```json
"schemaVersion": 1
```

The validator rejects unsupported schema versions.

## Plan

`plan` defines the calendar and main execution work.

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

### Optional Weekly Driver Contract

Schema v1 remains compatible with ordinary day-centric plans. A plan that wants week-level mastery can add reserved, non-required block types beginning with `WEEK_` anywhere inside that week. `This Week` collects those blocks and renders them as the weekly contract.

Recommended contract block types are:

```text
WEEK_WHY
WEEK_PREREQUISITES
WEEK_OUTCOME
WEEK_INTUITIVE_MODEL
WEEK_TECHNICAL_MODEL
WEEK_LEARN
WEEK_VISUAL
WEEK_RESCUE
WEEK_EXERCISES
WEEK_LAB
WEEK_BUILD_DEBUG
WEEK_RETRIEVAL
WEEK_EVIDENCE
WEEK_SPACED_RETRIEVAL
```

Use `required: false` for contract blocks. They describe the week's learning contract; they are not attendance boxes.

A V3-style weekly assessment uses one active-day block with:

```text
WEEK_MASTERY_PROOF
```

Its label or Markdown heading must contain a whole assessment word such as `PROOF`, `EXAM`, `DEFENCE`, or `CHECK` so the existing Proof system can discover it.

A week is not proven merely because its days or resources are complete. The week-level mastery gate requires:

- a passing independent assessment linked to that week;
- at least one verified evidence item linked to that week;
- zero open repair tasks linked to that week.

Daily completion remains useful execution telemetry. It is not a substitute for week-level proof.

### Optional Weekly Teacher Shelf

A weekly-driver plan can add precise resource cards without adding another schema or database table. Use non-required block types beginning with:

```text
WEEK_RESOURCE_
```

Supported role suffixes are:

```text
WEEK_RESOURCE_PRIMARY
WEEK_RESOURCE_VISUAL
WEEK_RESOURCE_INTERACTIVE
WEEK_RESOURCE_REFERENCE
WEEK_RESOURCE_RESCUE
WEEK_RESOURCE_LAB
```

Teacher Shelf blocks are read by `This Week` and excluded from the ordinary weekly-contract prose. They should normally live on a rest/metadata day with `required: false` and `plannedMinutes: 1`, so resource metadata never becomes attendance work.

The block `label` is the resource title. The `instructions` string contains one JSON object with these fields:

```json
{
  "url": "https://example.com/lesson",
  "modality": "VIDEO",
  "verified": true,
  "provider": "Example Teacher",
  "segment": "04:00–12:00",
  "use": "Watch once, close it, then reproduce the idea.",
  "notice": "Notice what changes and what stays invariant.",
  "why": "Use this as the human entrance to the concept."
}
```

`url` must use HTTP or HTTPS. `modality`, `provider`, `segment`, `use`, `notice`, and `why` are display metadata. `verified` indicates that the plan author has checked the assignment; Cracked Console does not independently certify an external source.

The Teacher Shelf follows the pedagogy rule: open only what the current task names. A resource can teach, visualize, provide practice, rescue a specific gap, or serve as an authoritative reference. Opening or watching a resource never proves the week.

## Days and Blocks

Each day needs:

- `date`;
- `rest`;
- `blocks`;
- `definitionOfDone`.

An active day needs at least one block. A rest day can have an empty block list and an empty definition-of-done list.

A block needs:

- `type`;
- `label`;
- `plannedMinutes`;
- `instructions`;
- `required`.

Use an uppercase identifier for `type`.

Non-required `WEEK_` contract and Teacher Shelf blocks can live on a protected rest day because the weekly view reads the entire configured week. Required work must not be placed on a protected rest day.

## Skills and Projects

Each skill needs `code`, `name`, and `family`. Codes and names must be unique.

Each project needs `code`, `name`, `coreIntegration`, `startDay`, `endDay`, `defenceAssessmentType`, and at least one milestone. Project day numbers must exist in the main plan.

## Reading

Reading is optional and independent from main-plan replacement.

A reading month defines its title, date range, and required book count. A reading book defines its month reference or `null`, slot, title, author, optional flags, and written assignment.

## Practice

Practice is optional and independent from main-plan replacement.

Use it for a self-paced practical track. A stage defines a goal and lessons. Lessons define a concept, practice assignment, review prompts, and optional resource links.

## Self-Paced Side Paths

`sidePaths` is optional. Use it for curiosity-driven learning that should have its own top-level section without becoming part of the calendar, weekly mastery gate, Learning Debt, or streak system.

Each side path needs:

- `code`: unique uppercase identifier;
- `title`: navigation/display title;
- `description`;
- at least one `stage`.

Each stage needs:

- `title`;
- `description`;
- at least one `item`.

Each item needs:

- `type` such as `VIDEO`, `BOOK`, `FILM`, `SERIES`, `PODCAST`, `COURSE`, or another user-defined text label;
- `title`;
- `description`.

Optional item fields are:

- `creator`;
- `difficulty`;
- `url` using HTTP or HTTPS.

Example:

```json
{
  "sidePaths": [
    {
      "code": "CURIOSITY_LAB",
      "title": "Curiosity Lab",
      "description": "Explore this whenever useful. No deadline.",
      "stages": [
        {
          "title": "Start Small",
          "description": "Begin with clear introductory material.",
          "items": [
            {
              "type": "VIDEO",
              "title": "A clear introduction",
              "description": "Watch when curiosity pulls you here.",
              "difficulty": "BEGINNER",
              "url": "https://example.com/introduction"
            }
          ]
        }
      ]
    }
  ]
}
```

Side-path items support optional local notes and three lightweight states: `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`. Those states are descriptive only. They never create calendar debt or prove main-curriculum mastery.

If side paths already exist locally, a later main-plan import does not overwrite them. Main-plan replacement also preserves them.

## JSON Schema

The repository includes:

```text
config/community-plan.schema.json
```

The schema includes the optional weekly-driver and side-path configuration shapes.

## Validate Before Import

Run:

```powershell
npm run config:validate -- user-config/plan.json
```

This runs both the established plan relationship checks and side-path validation.

Do not import a file that fails validation.

## Replacing an Imported Main Curriculum

Settings exposes an explicit plan-replacement action instead of silently replacing an active plan.

Before replacement, export a backup.

The replacement flow clears the current main curriculum plus its skills/project catalog, detaches historical assessments/evidence from old day/week numbers, and closes unresolved old-plan repair work. Reading, Practice, and self-paced side paths remain intact.

## Secrets

Do not put API keys, tokens, passwords, private keys, or other secrets in the configuration.

Core Cracked Console use does not require them.
