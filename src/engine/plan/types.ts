export interface PlanResourceInput { label: string; url: string; }
export interface PlanBlockInput { type: string; label: string; plannedMinutes: number; instructions: string; required: boolean; }
export interface PlanDayInput { date: string; label?: string; rest: boolean; phase?: number; blocks: PlanBlockInput[]; definitionOfDone: string[]; }
export interface PlanWeekInput { title: string; phase?: number; consolidation?: boolean; days: PlanDayInput[]; }
export interface CurriculumConfig { version: string; title: string; startDate: string; weeks: PlanWeekInput[]; resources?: PlanResourceInput[]; }
export interface SkillInput { code: string; name: string; family: string; }
export interface ProjectMilestoneInput { title: string; description: string; }
export interface ProjectInput { code: string; name: string; coreIntegration: string; startDay: number; endDay: number; defenceAssessmentType: string; milestones: ProjectMilestoneInput[]; }
export interface ReadingMonthInput { title: string; startDate: string; endDate: string; requiredCount: number; }
export interface ReadingBookInput { month: number | null; slot: number; title: string; author: string; shortRead?: boolean; bonus?: boolean; reread?: boolean; assignment: string; }
export interface CommunityConfig { curriculum: CurriculumConfig; skills: SkillInput[]; projects: ProjectInput[]; reading?: { months: ReadingMonthInput[]; books: ReadingBookInput[]; }; }
