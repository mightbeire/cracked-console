import { describe, expect, it } from "vitest";
import { parseTeacherResourceMetadata } from "./weekTeacherShelfRepository";

describe("teacher shelf metadata", () => {
  it("parses a valid weekly resource card", () => {
    const parsed = parseTeacherResourceMetadata(JSON.stringify({
      url: "https://example.com/lesson",
      modality: "VIDEO",
      verified: true,
      provider: "Example Teacher",
      segment: "04:00–12:00",
      use: "Watch once, close it, then reproduce the example.",
      notice: "Notice what changes and what stays invariant.",
      why: "Use this as the human entrance to the concept.",
    }));

    expect(parsed).toEqual({
      url: "https://example.com/lesson",
      modality: "VIDEO",
      verified: true,
      provider: "Example Teacher",
      segment: "04:00–12:00",
      use: "Watch once, close it, then reproduce the example.",
      notice: "Notice what changes and what stays invariant.",
      why: "Use this as the human entrance to the concept.",
    });
  });

  it("rejects malformed or non-http resource metadata", () => {
    expect(parseTeacherResourceMetadata("not json")).toBeNull();
    expect(parseTeacherResourceMetadata(JSON.stringify({ url: "file:///tmp/example" }))).toBeNull();
  });
});
