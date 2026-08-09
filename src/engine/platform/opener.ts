import { openUrl } from "@tauri-apps/plugin-opener";

export async function openCurriculumUrl(url: string): Promise<void> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http/https curriculum resources can be opened.");
  }
  await openUrl(parsed.toString());
}
