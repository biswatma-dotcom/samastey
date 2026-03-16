import { LearningStyle } from '@/types'
import { GENERATE_PRACTICE_PROBLEM, EVALUATE_ANSWER } from './prompts'
import { PracticeQuestion, EvaluationResult } from '@/types'
import { sarvamChat, extractJSON } from './client'

export async function generatePracticeQuestion(params: {
  conceptTitle: string
  difficulty: 'easy' | 'medium' | 'hard'
  learningStyle: LearningStyle
  previousProblems: string[]
  grade: number
}): Promise<PracticeQuestion> {
  const prompt = GENERATE_PRACTICE_PROBLEM(params)
  const text = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 4000 })
  try {
    return JSON.parse(extractJSON(text)) as PracticeQuestion
  } catch {
    throw new Error(`Failed to parse practice question. Raw: ${text.slice(0, 200)}`)
  }
}

export async function evaluateAnswer(params: {
  problem: string
  correctAnswer: string
  studentAnswer: string
  conceptTitle: string
}): Promise<EvaluationResult> {
  const prompt = EVALUATE_ANSWER(params)
  const text = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 3000 })
  try {
    return JSON.parse(extractJSON(text)) as EvaluationResult
  } catch {
    throw new Error(`Failed to parse evaluation result. Raw: ${text.slice(0, 200)}`)
  }
}

// Mastery score calculation
export function calculateMasteryDelta(params: {
  isCorrect: boolean
  hintsUsed: number
  correctStreak: number
  // Board exam: 0–100 partial credit percentage (undefined = MCQ binary)
  partialCredit?: number
}): number {
  const { isCorrect, hintsUsed, correctStreak, partialCredit } = params

  // Board exam question — use proportional scoring
  if (partialCredit !== undefined) {
    if (partialCredit >= 100) {
      // Full marks — same as MCQ correct
      return hintsUsed === 0 ? 15 : hintsUsed === 1 ? 10 : 5
    }
    if (partialCredit >= 60) return 8   // Good attempt (e.g. 2/3)
    if (partialCredit >= 30) return 3   // Partial understanding
    if (partialCredit > 0)   return 0   // Minimal credit — no gain, no loss
    return -3                           // Zero marks — small penalty
  }

  // MCQ — binary
  if (!isCorrect) return -5

  let points = hintsUsed === 0 ? 15 : hintsUsed === 1 ? 10 : 5

  // Streak bonus: 3 correct in a row
  if (correctStreak > 0 && correctStreak % 3 === 0) points += 10

  return points
}

export function calculateNewMasteryScore(currentScore: number, delta: number): number {
  return Math.min(100, Math.max(0, currentScore + delta))
}

export function isMastered(score: number): boolean {
  return score >= 80
}

export function calculateXPEarned(params: {
  isCorrect: boolean
  conceptMasteredNow: boolean
  wasAlreadyMastered: boolean
  partialCredit?: number
}): number {
  let xp = 0
  if (params.partialCredit !== undefined) {
    // Board: XP proportional to marks (max 10 XP for full marks)
    xp += Math.round((params.partialCredit / 100) * 10)
  } else if (params.isCorrect) {
    xp += 5
  }
  if (params.conceptMasteredNow && !params.wasAlreadyMastered) xp += 50
  return xp
}
