import { LearningStyle, Pace, Language } from '@/types'
import { EXPLAIN_CONCEPT, EXPLAIN_DIFFERENTLY, GENERATE_HINT, ANSWER_STUDENT_QUESTION } from './prompts'
import { sarvamChat, sarvamStream } from './client'
import { getTokenLimit } from '@/lib/db/appSettings'

export async function streamExplanation(params: {
  conceptTitle: string
  conceptDescription: string
  learningStyle: LearningStyle
  pace: Pace
  priorMistakes: string[]
  grade: number
  board: string
  objectives: string[]
  language?: Language
}): Promise<ReadableStream<Uint8Array>> {
  const prompt = EXPLAIN_CONCEPT(params)
  const max_tokens = await getTokenLimit('explain')
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens })
}

export async function streamAlternateExplanation(params: {
  conceptTitle: string
  learningStyle: LearningStyle
  previousApproach: string
  grade: number
  board: string
  language?: Language
}): Promise<ReadableStream<Uint8Array>> {
  const prompt = EXPLAIN_DIFFERENTLY(params)
  const max_tokens = await getTokenLimit('alternate')
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens })
}

export async function streamAnswer(params: {
  conceptTitle: string
  studentQuestion: string
  learningStyle: LearningStyle
  grade: number
  board: string
  language?: Language
}): Promise<ReadableStream<Uint8Array>> {
  const prompt = ANSWER_STUDENT_QUESTION(params)
  const max_tokens = await getTokenLimit('answer')
  return sarvamStream({ messages: [{ role: 'user', content: prompt }], max_tokens })
}

export async function generateHint(params: {
  problem: string
  hintNumber: number
  conceptTitle: string
  studentAnswer?: string
}): Promise<string> {
  const prompt = GENERATE_HINT(params)
  const max_tokens = await getTokenLimit('hint')
  return sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens })
}
