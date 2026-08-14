import { describe, expect, it } from "vitest";
import {
  determineAssessmentStatus,
  inferAssessmentType,
  isAssessmentHeading,
} from "./rules";

describe("assessment rules", () => {
  it("requires whole assessment words", () => {
    expect(isAssessmentHeading("Work through this example carefully.")).toBe(false);
    expect(isAssessmentHeading("Keep checking your ordinary notes.")).toBe(false);
    expect(isAssessmentHeading("Defensively validate the input.")).toBe(false);

    expect(isAssessmentHeading("Week 7 Proof")).toBe(true);
    expect(isAssessmentHeading("Quarter Exam")).toBe(true);
    expect(isAssessmentHeading("Project Defence")).toBe(true);
    expect(isAssessmentHeading("Monthly Check")).toBe(true);
  });

  it("keeps explicit mastery headings discoverable", () => {
    expect(isAssessmentHeading("WEEK_MASTERY_PROOF Week 18 Mastery Proof")).toBe(true);
    expect(inferAssessmentType("WEEK_MASTERY_PROOF Week 18 Mastery Proof")).toBe("WEEKLY_PROOF");
    expect(inferAssessmentType("FINAL CAPSTONE DEFENCE — WEEK 52 PROOF")).toBe("CAPSTONE_DEFENCE");
  });

  it("uses the configured seventy-percent pass boundary", () => {
    expect(determineAssessmentStatus(69, 100)).toBe("REPAIR_REQUIRED");
    expect(determineAssessmentStatus(70, 100)).toBe("PASS");
  });
});
