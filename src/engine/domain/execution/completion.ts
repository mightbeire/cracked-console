import type { LearningLogDraft, TodayDay } from "./types";

export function isLearningLogComplete(log: LearningLogDraft): boolean {
  return [log.learned, log.did, log.explainWithoutNotes, log.confused, log.nextAction].every(
    (value) => value.trim().length > 0,
  );
}

export function canCompleteDay(day: TodayDay): boolean {
  if (day.isRestDay) return false;
  const requiredBlocksComplete = day.blocks.filter((block) => block.required).every((block) => block.status === "COMPLETE");
  const requiredDodComplete = day.dodItems.filter((item) => item.required).every((item) => item.complete);
  const logRequired = day.blocks.some((block) => ["LOG", "LEARNING_LOG"].includes(block.type.toUpperCase()));
  return requiredBlocksComplete
    && requiredDodComplete
    && (!logRequired || isLearningLogComplete(day.learningLog));
}

export function completionSummary(day: TodayDay): { completeBlocks: number; totalBlocks: number; completeDod: number; totalDod: number } {
  return {
    completeBlocks: day.blocks.filter((block) => block.status === "COMPLETE").length,
    totalBlocks: day.blocks.length,
    completeDod: day.dodItems.filter((item) => item.complete).length,
    totalDod: day.dodItems.length,
  };
}
