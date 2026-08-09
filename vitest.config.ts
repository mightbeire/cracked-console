import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const nodeProcess = (
  globalThis as typeof globalThis & {
    process?: { env: Record<string, string | undefined> };
  }
).process;

if (nodeProcess) nodeProcess.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: true }
});
