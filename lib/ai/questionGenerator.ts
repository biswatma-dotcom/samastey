import { LearningStyle, Language, LANGUAGE_NAMES } from '@/types'
import { sarvamChat, extractJSON } from './client'
import { GENERATE_BOARD_QUESTION, EVALUATE_BOARD_ANSWER } from './prompts'

export type Difficulty = 'easy' | 'medium' | 'hard'

// Detects questions that reference content they forgot to include
// End-of-string patterns: phrase is dangling at the end (clearly forgot the content)
const INCOMPLETE_PATTERNS_END = [
  /correct the following sentence\s*[.:]?\s*$/i,
  /read the following (sentence|passage|paragraph|extract)\s*[.:]?\s*$/i,
  /refer(ring)? to the (following|above|given)\s*[.:]?\s*$/i,
  /based on the (following|above|given) (sentence|passage|paragraph|table|data)\s*[.:]?\s*$/i,
  /the following (sentence|passage|paragraph|table|equation)\s*[.:]?\s*$/i,
  /given (below|above)\s*[.:]?\s*$/i,
]

// Anywhere-in-string patterns: references external content that was never provided
const INCOMPLETE_PATTERNS_ANY = [
  /based on the (timeline|passage|figure|table|graph|diagram|chart|map|extract|data|information) (provided|given|above|below)/i,
  /the (timeline|passage|figure|table|graph|diagram|chart|map|extract) (provided|given|above|below|shown)/i,
  /refer(ring)? to the (timeline|passage|figure|table|graph|diagram|chart|map) (provided|given|above|below)/i,
  /as shown in the (figure|diagram|table|graph|chart)/i,
  /the (above|given|following) (figure|diagram|table|graph|chart|passage|extract|timeline)/i,
]

function isIncomplete(problem: string): boolean {
  const trimmed = problem.trim()
  if (INCOMPLETE_PATTERNS_END.some((re) => re.test(trimmed))) return true
  if (INCOMPLETE_PATTERNS_ANY.some((re) => re.test(trimmed))) return true
  return false
}

export function pickDifficulty(correctStreak: number, lastWasCorrect: boolean | null): Difficulty {
  if (lastWasCorrect === false) return 'easy'
  if (correctStreak >= 3) return 'hard'
  if (correctStreak >= 1) return 'medium'
  return 'medium'
}

export async function generatePracticeQuestion(params: {
  conceptTitle: string
  subjectName: string
  board: string
  learningStyle: LearningStyle
  grade: number
  difficulty: Difficulty
  previousProblems: string[]
  language?: Language
}) {
  const { conceptTitle, subjectName, board, learningStyle, grade, difficulty, previousProblems, language } = params
  const textbook = board === 'CBSE' ? 'NCERT' : 'ICSE'

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

  const prompt = `${langInstruction}Generate ONE ${difficulty} difficulty multiple-choice practice question for a Class ${grade} ${board} student.
Subject: ${subjectName}
Concept/Chapter: "${conceptTitle}"
Textbook: ${textbook} Class ${grade}

IMPORTANT: The question MUST be about ${subjectName} — specifically about "${conceptTitle}". Do NOT generate questions from other subjects.
Use the exact terminology, definitions, and examples from the ${textbook} Class ${grade} textbook. The question style should match ${board} board exam papers.

${styleHint}${avoidSection}

The question should genuinely test understanding, not just recall. For 'hard', test application or multi-step reasoning. For 'easy', test core definition or direct formula use.

CRITICAL: The "problem" field must be 100% self-contained. NEVER reference external content with phrases like "the timeline provided", "the passage above", "as shown in the figure", "the following sentence", "the given table", or ANY similar phrase — unless the actual content (the timeline, passage, figure, table, etc.) is fully written out INSIDE the problem text itself. If you cannot include the content inline, write a different question entirely.

Return ONLY valid JSON (no markdown, no extra text, no HTML tags like <br> or <p>):
{
  "problem": "the question text",
  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
  "answer": "A. option1",
  "explanation": "step-by-step solution explanation (2-3 sentences)"
}`

  const retryPrompt = prompt + '\n\nREMINDER: Include the complete sentence/passage/data INSIDE the problem text. Do not say "the following sentence" without providing it.'

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await sarvamChat({ messages: [{ role: 'user', content: attempt === 0 ? prompt : retryPrompt }], max_tokens: 4000 })
    const parsed = JSON.parse(extractJSON(raw))
    const problem = parsed.problem as string
    if (!isIncomplete(problem)) {
      return {
        problem,
        type: 'multiple_choice' as const,
        options: parsed.options as string[],
        answer: parsed.answer as string,
        explanation: parsed.explanation as string,
      }
    }
  }
  throw new Error('Generated question was incomplete after retry')
}

// Board exam marks distribution — weighted toward common question types
const BOARD_MARKS_OPTIONS: (1 | 2 | 3 | 5)[] = [1, 1, 2, 3, 3, 5]

export async function generateBoardQuestion(params: {
  conceptTitle: string
  subjectName: string
  board: string
  grade: number
  previousProblems: string[]
  language?: Language
}) {
  // Pick marks randomly weighted toward 3-mark questions
  const marks = BOARD_MARKS_OPTIONS[Math.floor(Math.random() * BOARD_MARKS_OPTIONS.length)]

  const prompt = GENERATE_BOARD_QUESTION({ ...params, marks })
  const retryPrompt = prompt + '\n\nREMINDER: The problem field must include the complete sentence/passage/data inline. Never say "the following sentence" without providing it.'

  let parsed: any
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await sarvamChat({ messages: [{ role: 'user', content: attempt === 0 ? prompt : retryPrompt }], max_tokens: 4000 })
    parsed = JSON.parse(extractJSON(raw))
    if (!isIncomplete(parsed.problem as string)) break
  }

  return {
    problem: parsed.problem as string,
    type: `board_${marks}` as 'board_1' | 'board_2' | 'board_3' | 'board_5',
    options: [] as string[],
    answer: parsed.modelAnswer as string,
    explanation: Array.isArray(parsed.markingScheme) ? parsed.markingScheme.join('\n') : '',
    marks,
    markingScheme: (Array.isArray(parsed.markingScheme) ? parsed.markingScheme : []).map((p: any) =>
      String(typeof p === 'object' ? p.point ?? p.text ?? JSON.stringify(p) : p)
    ),
    isDiagramQuestion: !!(parsed.isDiagramQuestion),
    modelDiagram: parsed.modelDiagram as { format: 'svg' | 'chart' | 'mermaid'; code: string } | null ?? null,
  }
}

export async function evaluateBoardAnswer(params: {
  problem: string
  modelAnswer: string
  markingScheme: string[]
  studentAnswer: string
  marks: number
  conceptTitle: string
  board: string
  isDiagramQuestion?: boolean
}) {
  const prompt = EVALUATE_BOARD_ANSWER(params)
  const raw = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 2000 })
  const parsed = JSON.parse(extractJSON(raw))
  const marksAwarded = Number(parsed.marksAwarded ?? 0)
  const marksTotal = Number(parsed.marksTotal ?? params.marks) || params.marks
  return {
    marksAwarded,
    marksTotal,
    isCorrect: marksAwarded >= marksTotal,
    feedback: String(parsed.feedback ?? ''),
    markingBreakdown: typeof parsed.markingBreakdown === 'string'
      ? parsed.markingBreakdown
      : Array.isArray(parsed.markingBreakdown)
        ? parsed.markingBreakdown.map((p: any) => String(typeof p === 'object' ? p.point ?? JSON.stringify(p) : p)).join('\n')
        : String(parsed.markingBreakdown ?? ''),
    mistakeType: parsed.mistakeType ?? null,
    partialCredit: Math.round((marksAwarded / marksTotal) * 100),
  }
}
