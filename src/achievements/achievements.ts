/**
 * Educational achievements. They're derived from lesson, quiz and puzzle
 * progress only; nothing here ever looks at session results or money.
 */
export interface AchievementInput {
  lessonsCompleted: number
  totalLessons: number
  quizzesCompleted: number
  questionsAnswered: number
  perfectQuizzes: number
  masteredRankings: boolean
  categoriesPlayed: number
  puzzlesCompleted: number
  longestPuzzleStreak: number
  bestPuzzleAccuracy: number | null
}

export type AchievementIcon = 'book' | 'cap' | 'spark' | 'stack' | 'star' | 'crown' | 'compass' | 'puzzle' | 'flame' | 'target'

export interface AchievementDef {
  id: string
  name: string
  description: string
  icon: AchievementIcon
  target: (i: AchievementInput) => number
  progress: (i: AchievementInput) => number
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-lesson', name: 'First lesson', description: 'Complete a rules lesson.', icon: 'book', target: () => 1, progress: (i) => i.lessonsCompleted },
  { id: 'rules-graduate', name: 'Rules graduate', description: 'Complete every lesson in the rules guide.', icon: 'cap', target: (i) => i.totalLessons, progress: (i) => i.lessonsCompleted },
  { id: 'first-quiz', name: 'Quiz rookie', description: 'Finish your first quiz.', icon: 'spark', target: () => 1, progress: (i) => i.quizzesCompleted },
  { id: 'fifty-questions', name: 'Fifty questions', description: 'Answer 50 quiz questions.', icon: 'stack', target: () => 50, progress: (i) => i.questionsAnswered },
  { id: 'flawless', name: 'Flawless', description: 'Get every question right in a quiz.', icon: 'star', target: () => 1, progress: (i) => i.perfectQuizzes },
  { id: 'rankings-master', name: 'Hand rankings master', description: 'Score 5/5 on an Advanced hand rankings quiz.', icon: 'crown', target: () => 1, progress: (i) => (i.masteredRankings ? 1 : 0) },
  { id: 'well-rounded', name: 'Well rounded', description: 'Answer questions in all six quiz categories.', icon: 'compass', target: () => 6, progress: (i) => i.categoriesPlayed },
  { id: 'five-puzzles', name: 'Puzzle regular', description: 'Finish five daily puzzles.', icon: 'puzzle', target: () => 5, progress: (i) => i.puzzlesCompleted },
  { id: 'puzzle-week', name: 'Seven-day streak', description: 'Solve the daily puzzle seven days in a row.', icon: 'flame', target: () => 7, progress: (i) => i.longestPuzzleStreak },
  { id: 'sharp-eye', name: 'Sharp eye', description: 'Score 95% or better on a daily puzzle.', icon: 'target', target: () => 1, progress: (i) => ((i.bestPuzzleAccuracy ?? 0) >= 95 ? 1 : 0) },
]

export interface AchievementStatus extends Omit<AchievementDef, 'target' | 'progress'> {
  current: number
  target: number
  unlocked: boolean
}

export function computeAchievements(input: AchievementInput): AchievementStatus[] {
  return ACHIEVEMENTS.map(({ target, progress, ...def }) => {
    const t = Math.max(1, target(input))
    const p = progress(input)
    return { ...def, target: t, current: Math.min(p, t), unlocked: p >= t }
  })
}
