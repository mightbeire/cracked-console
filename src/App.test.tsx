import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./engine/data/configImportRepository", () => ({
  getImportedConfigSummary: vi.fn().mockResolvedValue(null),
  importCommunityConfig: vi.fn(),
}));

vi.mock("./engine/platform/dialog", () => ({
  chooseJsonOpenPath: vi.fn().mockResolvedValue(null),
}));

vi.mock("./engine/platform/nativeFiles", () => ({
  readTextFile: vi.fn(),
}));

describe("Community Stage 3 shell", () => {
  it("asks the user for their own plan", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Set up your learning plan." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose plan JSON" })).toBeInTheDocument();
  });
});
