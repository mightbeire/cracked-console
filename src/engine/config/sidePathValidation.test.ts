import { describe, expect, it } from "vitest";
import type { ConfigIssue } from "./types";
import { validateSidePaths } from "./sidePathValidation";

describe("side path validation", () => {
  it("accepts a minimal valid self-paced path", () => {
    const issues: ConfigIssue[] = [];
    validateSidePaths([
      {
        code: "CURIOSITY_LAB",
        title: "Curiosity Lab",
        description: "Explore without calendar debt.",
        stages: [
          {
            title: "Start",
            description: "Begin here.",
            items: [
              {
                type: "VIDEO",
                title: "Introduction",
                description: "Watch when useful.",
                difficulty: "BEGINNER",
                url: "https://example.com/intro",
              },
            ],
          },
        ],
      },
    ], issues);
    expect(issues).toEqual([]);
  });

  it("rejects duplicate codes and unsafe URLs", () => {
    const issues: ConfigIssue[] = [];
    validateSidePaths([
      {
        code: "PATH_ONE",
        title: "One",
        description: "First path.",
        stages: [{
          title: "Start",
          description: "Begin.",
          items: [{ type: "LINK", title: "Bad", description: "Bad URL.", url: "file:///tmp/test" }],
        }],
      },
      {
        code: "PATH_ONE",
        title: "Two",
        description: "Second path.",
        stages: [{
          title: "Start",
          description: "Begin.",
          items: [{ type: "BOOK", title: "Book", description: "Read." }],
        }],
      },
    ], issues);
    expect(issues.some((issue) => issue.path.endsWith(".code") && issue.message.includes("duplicated"))).toBe(true);
    expect(issues.some((issue) => issue.path.endsWith(".url"))).toBe(true);
  });
});
