import { LearningStyle } from '@/types'
import { DETECT_LEARNING_STYLE } from './prompts'
import { sarvamChat, extractJSON } from './client'

export async function detectLearningStyle(interactions: {
  type: string
  timeSpent: number
  correctOnFirst: boolean
  hintsUsed: number
}[]): Promise<{ style: LearningStyle; confidence: number; reasoning: string }> {
  if (interactions.length < 5) {
    return { style: 'UNKNOWN', confidence: 0, reasoning: 'Not enough data' }
  }

  const prompt = DETECT_LEARNING_STYLE(interactions)
  const text = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 200 })
  try {
    const result = JSON.parse(extractJSON(text))
    return {
      style: result.style as LearningStyle,
      confidence: result.confidence,
      reasoning: result.reasoning,
    }
  } catch {
    return { style: 'UNKNOWN', confidence: 0, reasoning: 'Parse error' }
  }
}
