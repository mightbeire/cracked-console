import { describe, expect, it } from "vitest";
import {
  summarizeCommunityConfig,
  validateCommunityConfig,
} from "./validate";
import type { CommunityConfig } from "./types";

const valid: CommunityConfig = {
  schemaVersion: 1,
  plan: {
    version: "1.0",
    title: "Example Plan",
    startDate: "2030-01-07",
    weeks: [
      {
        title: "Week 1",
        days: [
          {
            date: "2030-01-07",
            rest: false,
            blocks: [
              {
                type: "FOCUS",
                label: "Focus",
                plannedMinutes: 45,
                instructions: "Complete one focused task.",
                required: true,
              },
            ],
            definitionOfDone: ["Write a short result note."],
          },
          {
            date: "2030-01-08",
            rest: true,
            blocks: [],
            definitionOfDone: [],
          },
        ],
      },
    ],
  },
  skills: [{ code: "WRITE", name: "Clear Writing", family: "Communication" }],
  projects: [],
};

describe("community configuration", () => {
  it("accepts a small valid plan", () => {
    expect(validateCommunityConfig(valid)).toEqual([]);
    expect(summarizeCommunityConfig(valid)).toMatchObject({
      days: 2,
      activeDays: 1,
      restDays: 1,
      skills: 1,
    });
  });

  it("rejects a date gap", () => {
    const broken = structuredClone(valid);
    broken.plan.weeks[0]!.days[1]!.date = "2030-01-09";
    expect(validateCommunityConfig(broken).some(
      (issue) => issue.message.includes("contiguous"),
    )).toBe(true);
  });

  it("rejects a project outside the plan", () => {
    const broken = structuredClone(valid);
    broken.projects = [{
      code: "P1",
      name: "Example",
      coreIntegration: "Use two skills.",
      startDay: 1,
      endDay: 20,
      defenceAssessmentType: "PROJECT_DEFENCE",
      milestones: [{ title: "Build", description: "Build the result." }],
    }];
    expect(validateCommunityConfig(broken).some(
      (issue) => issue.path.endsWith("endDay"),
    )).toBe(true);
  });
});
