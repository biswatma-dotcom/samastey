import { LearningStyle, Pace, Language } from '@/types'
import { EXPLAIN_CONCEPT, EXPLAIN_DIFFERENTLY, GENERATE_HINT, ANSWER_STUDENT_QUESTION } from './prompts'
import { sarvamChat, sarvamStream } from './client'

export function streamExplanation(params: {
  conceptTitle: string
  conceptDescription: string
  learningStyle: LearningStyle
  pace: Pace
  priorMistakes: string[]
  grade: number
  board: string
  objectives: string[]
  language?: Language
}): ReadableStream<Uint8Array> {
  const prompt = EXPLAIN_CONCEPT(params)
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens: 32000 })
}

export function streamAlternateExplanation(params: {
  conceptTitle: string
  learningStyle: LearningStyle
  previousApproach: string
  language?: Language
}): ReadableStream<Uint8Array> {
  const prompt = EXPLAIN_DIFFERENTLY(params)
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens: 16000 })
}

export function streamAnswer(params: {
  conceptTitle: string
  studentQuestion: string
  learningStyle: LearningStyle
  grade: number
  board: string
  language?: Language
}): ReadableStream<Uint8Array> {
  const prompt = ANSWER_STUDENT_QUESTION(params)
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens: 16000 })
}

export async function generateHint(params: {
  problem: string
  hintNumber: number
  conceptTitle: string
  studentAnswer?: string
}): Promise<string> {
  const prompt = GENERATE_HINT(params)
  return sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 3000 })
}
