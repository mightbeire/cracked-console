import type { ConfigIssue, SidePathConfig } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function httpUrl(value: unknown): boolean {
  if (value === undefined) return true;
  if (!text(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateSidePaths(
  sidePaths: unknown,
  issues: ConfigIssue[],
): asserts sidePaths is SidePathConfig[] | undefined {
  if (sidePaths === undefined) return;
  if (!Array.isArray(sidePaths)) {
    issues.push({ path: "sidePaths", message: "Self-paced side paths must be an array." });
    return;
  }

  const codes = new Set<string>();
  const titles = new Set<string>();

  sidePaths.forEach((pathValue, pathIndex) => {
    const path = `sidePaths[${pathIndex}]`;
    if (!isObject(pathValue)) {
      issues.push({ path, message: "Side path must be an object." });
      return;
    }

    if (!text(pathValue.code)) {
      issues.push({ path: `${path}.code`, message: "Code is required." });
    } else if (!/^[A-Z][A-Z0-9_]*$/.test(pathValue.code)) {
      issues.push({ path: `${path}.code`, message: "Use an uppercase identifier." });
    } else if (codes.has(pathValue.code)) {
      issues.push({ path: `${path}.code`, message: "Side-path code is duplicated." });
    } else {
      codes.add(pathValue.code);
    }

    if (!text(pathValue.title)) {
      issues.push({ path: `${path}.title`, message: "Title is required." });
    } else if (titles.has(pathValue.title)) {
      issues.push({ path: `${path}.title`, message: "Side-path title is duplicated." });
    } else {
      titles.add(pathValue.title);
    }

    if (!text(pathValue.description)) {
      issues.push({ path: `${path}.description`, message: "Description is required." });
    }

    if (!Array.isArray(pathValue.stages) || pathValue.stages.length === 0) {
      issues.push({ path: `${path}.stages`, message: "Add at least one stage." });
      return;
    }

    pathValue.stages.forEach((stageValue, stageIndex) => {
      const stagePath = `${path}.stages[${stageIndex}]`;
      if (!isObject(stageValue)) {
        issues.push({ path: stagePath, message: "Stage must be an object." });
        return;
      }
      if (!text(stageValue.title)) issues.push({ path: `${stagePath}.title`, message: "Title is required." });
      if (!text(stageValue.description)) issues.push({ path: `${stagePath}.description`, message: "Description is required." });
      if (!Array.isArray(stageValue.items) || stageValue.items.length === 0) {
        issues.push({ path: `${stagePath}.items`, message: "Add at least one item." });
        return;
      }

      stageValue.items.forEach((itemValue, itemIndex) => {
        const itemPath = `${stagePath}.items[${itemIndex}]`;
        if (!isObject(itemValue)) {
          issues.push({ path: itemPath, message: "Item must be an object." });
          return;
        }
        if (!text(itemValue.type)) issues.push({ path: `${itemPath}.type`, message: "Type is required." });
        if (!text(itemValue.title)) issues.push({ path: `${itemPath}.title`, message: "Title is required." });
        if (itemValue.creator !== undefined && typeof itemValue.creator !== "string") {
          issues.push({ path: `${itemPath}.creator`, message: "Creator must be text when supplied." });
        }
        if (!text(itemValue.description)) issues.push({ path: `${itemPath}.description`, message: "Description is required." });
        if (itemValue.difficulty !== undefined && typeof itemValue.difficulty !== "string") {
          issues.push({ path: `${itemPath}.difficulty`, message: "Difficulty must be text when supplied." });
        }
        if (!httpUrl(itemValue.url)) {
          issues.push({ path: `${itemPath}.url`, message: "Use an HTTP or HTTPS URL." });
        }
      });
    });
  });
}
