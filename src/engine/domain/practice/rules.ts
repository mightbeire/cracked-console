export interface PracticeLessonState { learned:boolean; practiced:boolean; reviewed:boolean; selectedExplained:boolean; }
export function practiceLessonComplete(state:PracticeLessonState):boolean { return state.learned && state.practiced && state.reviewed && state.selectedExplained; }
