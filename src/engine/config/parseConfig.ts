import type { CommunityConfig, ConfigIssue } from "./types";
import { validateCommunityConfig } from "./validate";
import { validateSidePaths } from "./sidePathValidation";

export function parseCommunityConfigWithSidePaths(raw: string): {
  config: CommunityConfig | null;
  issues: ConfigIssue[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      config: null,
      issues: [{ path: "$", message: "File is not valid JSON." }],
    };
  }

  const issues = validateCommunityConfig(parsed);
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    validateSidePaths((parsed as Record<string, unknown>).sidePaths, issues);
  }

  return {
    config: issues.length === 0 ? parsed as CommunityConfig : null,
    issues,
  };
}
