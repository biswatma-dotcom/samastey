import { LearningStyle, Language, LANGUAGE_NAMES } from '@/types'
import { sarvamChat, extractJSON } from './client'

export type Difficulty = 'easy' | 'medium' | 'hard'

export function pickDifficulty(correctStreak: number, lastWasCorrect: boolean | null): Difficulty {
  if (lastWasCorrect === false) return 'easy'
  if (correctStreak >= 3) return 'hard'
  if (correctStreak >= 1) return 'medium'
  return 'medium'
}

export async function generatePracticeQuestion(params: {
  conceptTitle: string
  learningStyle: LearningStyle
  grade: number
  difficulty: Difficulty
  previousProblems: string[]
  language?: Language
}) {
  const { conceptTitle, learningStyle, grade, difficulty, previousProblems, language } = params

  const langInstruction = language && language !== 'en'
    ? `IMPORTANT: Write the entire question, all answer options, and the explanation in ${LANGUAGE_NAMES[language]}. Only keep mathematical symbols and formulas in English.\n\n`
    : ''

  const styleHint =
    learningStyle === 'VISUAL' ? 'Include a structured table or visual description if applicable.' :
    learningStyle === 'KINESTHETIC' ? 'Frame it as a real-world application problem.' :
    learningStyle === 'READING_WRITING' ? 'Use precise mathematical language with clear definitions.' :
    ''

  const avoidSection = previousProblems.length > 0
    ? `\nDo NOT repeat or closely resemble these previous problems:\n${previousProblems.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
    : ''

  const prompt = `${langInstruction}Generate ONE ${difficulty} difficulty multiple-choice practice question for a Class ${grade} student on the concept: "${conceptTitle}".

${styleHint}${avoidSection}

The question should genuinely test understanding, not just recall. For 'hard', test application or multi-step reasoning. For 'easy', test core definition or direct formula use.

Return ONLY valid JSON (no markdown, no extra text):
{
  "problem": "the question text",
  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
  "answer": "A. option1",
  "explanation": "step-by-step solution explanation (2-3 sentences)"
}`

  const raw = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 4000 })
  const parsed = JSON.parse(extractJSON(raw))

  return {
    problem: parsed.problem as string,
    type: 'multiple_choice' as const,
    options: parsed.options as string[],
    answer: parsed.answer as string,
    explanation: parsed.explanation as string,
  }
}
