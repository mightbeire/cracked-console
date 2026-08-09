export interface PracticeResource {
  id: number;
  label: string;
  url: string;
  resourceType: string;
  note: string;
}

export interface PracticeLesson {
  id: number;
  stageId: number;
  sortOrder: number;
  title: string;
  concept: string;
  practiceAssignment: string;
  reviewPrompts: string;
  learned: boolean;
  practiced: boolean;
  reviewed: boolean;
  selectedExplained: boolean;
  notes: string;
  completedAt: string | null;
  resources: PracticeResource[];
}

export interface PracticeStage {
  id: number;
  sortOrder: number;
  title: string;
  goal: string;
  unlockAfterStageId: number | null;
  unlocked: boolean;
  complete: boolean;
  lessons: PracticeLesson[];
}

export interface PracticeLog {
  id: number;
  lessonId: number | null;
  lessonTitle: string | null;
  title: string;
  practiceDate: string;
  goal: string;
  quantity: number;
  representativeFile: string | null;
  bestNotes: string;
  worstNotes: string;
  reflection: string;
  createdAt: string;
}

export type PracticeRating = "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE" | null;

export interface PracticePreference {
  categoryId: number;
  name: string;
  rating: PracticeRating;
  note: string;
}

export interface PracticeChallenge {
  id: number;
  minimumStageOrder: number;
  title: string;
  prompt: string;
}
