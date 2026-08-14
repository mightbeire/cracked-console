import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-side-paths.mjs <plan.json>");
  process.exit(2);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
} catch (error) {
  console.error(`Side-path validation could not read JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const issues = [];
const text = (value) => typeof value === "string" && value.trim().length > 0;
const object = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function validUrl(value) {
  if (value === undefined) return true;
  if (!text(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const sidePaths = parsed?.sidePaths;
if (sidePaths !== undefined && !Array.isArray(sidePaths)) {
  issues.push("sidePaths must be an array when supplied");
} else if (Array.isArray(sidePaths)) {
  const codes = new Set();
  const titles = new Set();
  sidePaths.forEach((entry, pathIndex) => {
    const prefix = `sidePaths[${pathIndex}]`;
    if (!object(entry)) {
      issues.push(`${prefix} must be an object`);
      return;
    }
    if (!text(entry.code) || !/^[A-Z][A-Z0-9_]*$/.test(entry.code)) {
      issues.push(`${prefix}.code must be an uppercase identifier`);
    } else if (codes.has(entry.code)) {
      issues.push(`${prefix}.code is duplicated`);
    } else codes.add(entry.code);

    if (!text(entry.title)) issues.push(`${prefix}.title is required`);
    else if (titles.has(entry.title)) issues.push(`${prefix}.title is duplicated`);
    else titles.add(entry.title);
    if (!text(entry.description)) issues.push(`${prefix}.description is required`);
    if (!Array.isArray(entry.stages) || entry.stages.length === 0) {
      issues.push(`${prefix}.stages must contain at least one stage`);
      return;
    }

    entry.stages.forEach((stage, stageIndex) => {
      const stagePrefix = `${prefix}.stages[${stageIndex}]`;
      if (!object(stage)) {
        issues.push(`${stagePrefix} must be an object`);
        return;
      }
      if (!text(stage.title)) issues.push(`${stagePrefix}.title is required`);
      if (!text(stage.description)) issues.push(`${stagePrefix}.description is required`);
      if (!Array.isArray(stage.items) || stage.items.length === 0) {
        issues.push(`${stagePrefix}.items must contain at least one item`);
        return;
      }

      stage.items.forEach((item, itemIndex) => {
        const itemPrefix = `${stagePrefix}.items[${itemIndex}]`;
        if (!object(item)) {
          issues.push(`${itemPrefix} must be an object`);
          return;
        }
        if (!text(item.type)) issues.push(`${itemPrefix}.type is required`);
        if (!text(item.title)) issues.push(`${itemPrefix}.title is required`);
        if (item.creator !== undefined && typeof item.creator !== "string") issues.push(`${itemPrefix}.creator must be text`);
        if (!text(item.description)) issues.push(`${itemPrefix}.description is required`);
        if (item.difficulty !== undefined && typeof item.difficulty !== "string") issues.push(`${itemPrefix}.difficulty must be text`);
        if (!validUrl(item.url)) issues.push(`${itemPrefix}.url must be HTTP or HTTPS`);
      });
    });
  });
}

if (issues.length) {
  console.error(`Side-path validation failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

const pathCount = Array.isArray(sidePaths) ? sidePaths.length : 0;
const itemCount = Array.isArray(sidePaths)
  ? sidePaths.reduce((sum, entry) => sum + entry.stages.reduce((stageSum, stage) => stageSum + stage.items.length, 0), 0)
  : 0;
console.log(`Side-path validation PASS (${pathCount} paths, ${itemCount} items)`);
