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
}): number {
  const { isCorrect, hintsUsed, correctStreak } = params

  if (!isCorrect) return -5

  let points = 0
  if (hintsUsed === 0) points = 15
  else if (hintsUsed === 1) points = 10
  else points = 5

  // Streak bonus: 3 correct in a row
  if (correctStreak > 0 && correctStreak % 3 === 0) {
    points += 10
  }

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
}): number {
  let xp = 0
  if (params.isCorrect) xp += 5
  if (params.conceptMasteredNow && !params.wasAlreadyMastered) xp += 50
  return xp
}
