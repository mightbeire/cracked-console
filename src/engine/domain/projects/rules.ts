import type { ProjectRecord, ProjectStatus } from "./types";

export function projectStatus(project: ProjectRecord, currentDayNumber: number | null): ProjectStatus {
  if (project.completedAt) return "COMPLETE";
  if (currentDayNumber !== null && currentDayNumber < project.startDay && !project.startedAt) return "UPCOMING";
  if (!project.startedAt) return "NOT_STARTED";

  const allMilestonesComplete = project.milestones.length > 0 && project.milestones.every((milestone) => milestone.completed);
  if (allMilestonesComplete && project.passingDefenceCount === 0) return "READY_FOR_DEFENCE";
  return "ACTIVE";
}

export function canCompleteProject(project: ProjectRecord): boolean {
  return (
    project.milestones.length > 0
    && project.milestones.every((milestone) => milestone.completed)
    && project.passingDefenceCount > 0
  );
}
