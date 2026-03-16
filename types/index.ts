export type LearningStyle = 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING_WRITING' | 'UNKNOWN'
export type Pace = 'SLOW' | 'MEDIUM' | 'FAST'
export type Board = 'CBSE' | 'ICSE' | 'STATE'
export type Language = 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'mr' | 'gu' | 'pa'

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी (Hindi)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  bn: 'বাংলা (Bengali)',
  mr: 'मराठी (Marathi)',
  gu: 'ગુજરાતી (Gujarati)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
}
export type Role = 'STUDENT' | 'PARENT' | 'ADMIN'
export type InteractionType =
  | 'EXPLANATION_REQUEST'
  | 'QUESTION_ANSWER'
  | 'PRACTICE_PROBLEM'
  | 'HINT_REQUEST'
  | 'CONCEPT_CHECK'

export interface StudentProfile {
  id: string
  userId: string
  grade: number
  board: Board
  learningStyle: LearningStyle
  learningPace: Pace
  xpTotal: number
  streakDays: number
  lastActiveAt: string | null
  user: {
    name: string
    email: string
  }
}

export interface ConceptWithProgress {
  id: string
  title: string
  description: string
  grade: number
  orderIndex: number
  estimatedMinutes: number
  objectives: { id: string; description: string; orderIndex: number }[]
  prerequisites: { id: string; title: string }[]
  record?: {
    masteryScore: number
    masteryAchieved: boolean
    attempts: number
  } | null
}

export type QuestionMode = 'mcq' | 'board'

export interface PracticeQuestion {
  problem: string
  type: 'multiple_choice' | 'fill_in_blank' | 'short_answer' | 'board_1' | 'board_2' | 'board_3' | 'board_5'
  options?: string[]
  answer: string
  explanation: string
  // board questions only
  marks?: number
  markingScheme?: string[]
}

export interface EvaluationResult {
  isCorrect: boolean
  partialCredit: number
  feedback: string
  mistakeType: 'conceptual' | 'calculation' | 'careless' | null
  hint: string
  // board questions only
  marksAwarded?: number
  marksTotal?: number
  markingBreakdown?: string
}

export interface MasteryUpdate {
  newScore: number
  masteryAchieved: boolean
  xpEarned: number
  streakBonus: boolean
}

export interface SubjectProgress {
  subjectId: string
  subjectName: string
  totalConcepts: number
  masteredConcepts: number
  inProgressConcepts: number
  masteryPercent: number
}
