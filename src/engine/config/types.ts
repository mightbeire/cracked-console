export interface CommunityConfig {
  schemaVersion: 1;
  plan: PlanConfig;
  skills: SkillConfig[];
  projects: ProjectConfig[];
  reading?: ReadingConfig;
  practice?: PracticeConfig;
  sidePaths?: SidePathConfig[];
}

export interface PlanConfig {
  version: string;
  title: string;
  startDate: string;
  weeks: WeekConfig[];
  resources?: ResourceConfig[];
}

export interface WeekConfig {
  title: string;
  phase?: number;
  consolidation?: boolean;
  days: DayConfig[];
}

export interface DayConfig {
  date: string;
  label?: string;
  rest: boolean;
  phase?: number;
  blocks: BlockConfig[];
  definitionOfDone: string[];
}

export interface BlockConfig {
  type: string;
  label: string;
  plannedMinutes: number;
  instructions: string;
  required: boolean;
}

export interface ResourceConfig {
  label: string;
  url: string;
}

export interface SkillConfig {
  code: string;
  name: string;
  family: string;
}

export interface ProjectConfig {
  code: string;
  name: string;
  coreIntegration: string;
  startDay: number;
  endDay: number;
  defenceAssessmentType: string;
  milestones: ProjectMilestoneConfig[];
}

export interface ProjectMilestoneConfig {
  title: string;
  description: string;
}

export interface ReadingConfig {
  months: ReadingMonthConfig[];
  books: ReadingBookConfig[];
}

export interface ReadingMonthConfig {
  title: string;
  startDate: string;
  endDate: string;
  requiredCount: number;
}

export interface ReadingBookConfig {
  month: number | null;
  slot: number;
  title: string;
  author: string;
  shortRead?: boolean;
  bonus?: boolean;
  reread?: boolean;
  assignment: string;
}

export interface PracticeConfig {
  title: string;
  stages: PracticeStageConfig[];
  categories?: string[];
  challenges?: PracticeChallengeConfig[];
}

export interface PracticeStageConfig {
  title: string;
  goal: string;
  unlockAfterStage?: number | null;
  lessons: PracticeLessonConfig[];
}

export interface PracticeLessonConfig {
  title: string;
  concept: string;
  practiceAssignment: string;
  reviewPrompts: string;
  resources?: ResourceConfig[];
}

export interface PracticeChallengeConfig {
  minimumStage: number;
  title: string;
  prompt: string;
}

export interface SidePathConfig {
  code: string;
  title: string;
  description: string;
  stages: SidePathStageConfig[];
}

export interface SidePathStageConfig {
  title: string;
  description: string;
  items: SidePathItemConfig[];
}

export interface SidePathItemConfig {
  type: string;
  title: string;
  creator?: string;
  description: string;
  difficulty?: string;
  url?: string;
}

export interface ConfigIssue {
  path: string;
  message: string;
}

export interface ConfigSummary {
  title: string;
  version: string;
  startDate: string;
  endDate: string;
  weeks: number;
  days: number;
  activeDays: number;
  restDays: number;
  blocks: number;
  skills: number;
  projects: number;
  readingBooks: number;
  practiceStages: number;
  practiceLessons: number;
  sidePaths: number;
  sidePathItems: number;
}
