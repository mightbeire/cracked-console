import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = process.argv[2] ?? "user-config/plan.json";
const path = resolve(input);

function issue(path, message) {
  return { path, message };
}

function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function integer(value, minimum = 0) {
  return Number.isInteger(value) && value >= minimum;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function validate(config) {
  const issues = [];
  if (!object(config)) return [issue("$", "Configuration must be a JSON object.")];
  if (config.schemaVersion !== 1) issues.push(issue("schemaVersion", "Schema version must be 1."));
  if (!object(config.plan)) return [...issues, issue("plan", "Plan is required.")];

  if (!text(config.plan.title)) issues.push(issue("plan.title", "Title is required."));
  if (!text(config.plan.version)) issues.push(issue("plan.version", "Version is required."));
  if (!validDate(config.plan.startDate)) issues.push(issue("plan.startDate", "Use YYYY-MM-DD."));
  if (!Array.isArray(config.plan.weeks) || config.plan.weeks.length === 0) {
    issues.push(issue("plan.weeks", "Add at least one week."));
    return issues;
  }

  const days = [];
  config.plan.weeks.forEach((week, weekIndex) => {
    const weekPath = `plan.weeks[${weekIndex}]`;
    if (!object(week)) {
      issues.push(issue(weekPath, "Week must be an object."));
      return;
    }
    if (!text(week.title)) issues.push(issue(`${weekPath}.title`, "Title is required."));
    if (!Array.isArray(week.days) || week.days.length === 0) {
      issues.push(issue(`${weekPath}.days`, "Add at least one day."));
      return;
    }

    week.days.forEach((day, dayIndex) => {
      const dayPath = `${weekPath}.days[${dayIndex}]`;
      if (!object(day)) {
        issues.push(issue(dayPath, "Day must be an object."));
        return;
      }
      days.push({ day, path: dayPath });
      if (!validDate(day.date)) issues.push(issue(`${dayPath}.date`, "Use YYYY-MM-DD."));
      if (typeof day.rest !== "boolean") issues.push(issue(`${dayPath}.rest`, "Rest must be true or false."));
      if (!Array.isArray(day.blocks)) {
        issues.push(issue(`${dayPath}.blocks`, "Blocks must be an array."));
      } else {
        if (day.rest === false && day.blocks.length === 0) {
          issues.push(issue(`${dayPath}.blocks`, "An active day needs at least one block."));
        }
        day.blocks.forEach((block, blockIndex) => {
          const blockPath = `${dayPath}.blocks[${blockIndex}]`;
          if (!object(block)) return issues.push(issue(blockPath, "Block must be an object."));
          if (!text(block.type) || !/^[A-Z][A-Z0-9_]*$/.test(block.type)) {
            issues.push(issue(`${blockPath}.type`, "Use uppercase letters, numbers, and underscores."));
          }
          if (!text(block.label)) issues.push(issue(`${blockPath}.label`, "Label is required."));
          if (!integer(block.plannedMinutes, 1) || block.plannedMinutes > 1440) {
            issues.push(issue(`${blockPath}.plannedMinutes`, "Planned minutes must be from 1 to 1440."));
          }
          if (!text(block.instructions)) issues.push(issue(`${blockPath}.instructions`, "Instructions are required."));
          if (typeof block.required !== "boolean") issues.push(issue(`${blockPath}.required`, "Required must be true or false."));
        });
      }
      if (!Array.isArray(day.definitionOfDone)) {
        issues.push(issue(`${dayPath}.definitionOfDone`, "Definition of done must be an array."));
      }
    });
  });

  if (days.length > 0) {
    if (validDate(config.plan.startDate) && days[0].day.date !== config.plan.startDate) {
      issues.push(issue("plan.startDate", "Start date must match the first plan day."));
    }
    for (let i = 1; i < days.length; i += 1) {
      const previous = days[i - 1].day.date;
      const current = days[i].day.date;
      if (validDate(previous) && validDate(current)) {
        const expected = addDays(previous, 1);
        if (current !== expected) {
          issues.push(issue(`${days[i].path}.date`, `Plan dates must be contiguous. Expected ${expected}.`));
        }
      }
    }
  }

  if (!Array.isArray(config.skills)) issues.push(issue("skills", "Skills must be an array."));
  if (!Array.isArray(config.projects)) issues.push(issue("projects", "Projects must be an array."));

  if (Array.isArray(config.projects)) {
    config.projects.forEach((project, index) => {
      const path = `projects[${index}]`;
      if (!object(project)) return issues.push(issue(path, "Project must be an object."));
      if (!integer(project.startDay, 1) || project.startDay > days.length) issues.push(issue(`${path}.startDay`, "Start day must reference a plan day."));
      if (!integer(project.endDay, 1) || project.endDay > days.length) issues.push(issue(`${path}.endDay`, "End day must reference a plan day."));
      if (!Array.isArray(project.milestones) || project.milestones.length === 0) issues.push(issue(`${path}.milestones`, "Add at least one milestone."));
    });
  }

  if (config.reading !== undefined) {
    if (!object(config.reading) || !Array.isArray(config.reading.months) || !Array.isArray(config.reading.books)) {
      issues.push(issue("reading", "Reading needs months and books arrays."));
    }
  }

  if (config.practice !== undefined) {
    if (!object(config.practice) || !Array.isArray(config.practice.stages) || config.practice.stages.length === 0) {
      issues.push(issue("practice.stages", "Practice needs at least one stage."));
    }
  }

  return issues;
}

let raw;
try {
  raw = await readFile(path, "utf8");
} catch (error) {
  console.error(`Configuration validation: FAIL - cannot read ${input}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

let config;
try {
  config = JSON.parse(raw);
} catch {
  console.error(`Configuration validation: FAIL - ${input} is not valid JSON.`);
  process.exit(1);
}

const issues = validate(config);
if (issues.length > 0) {
  console.error(`Configuration validation: FAIL (${issues.length} issue${issues.length === 1 ? "" : "s"})`);
  for (const item of issues) console.error(`${item.path}: ${item.message}`);
  process.exit(1);
}

const days = config.plan.weeks.flatMap((week) => week.days);
const blocks = days.reduce((sum, day) => sum + day.blocks.length, 0);
console.log(
  `Configuration validation: PASS (${config.plan.weeks.length} weeks, `
  + `${days.length} days, ${blocks} blocks, ${config.skills.length} skills, `
  + `${config.projects.length} projects)`,
);
