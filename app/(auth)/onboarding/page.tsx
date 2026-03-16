'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const BOARDS = [
  {
    value: 'CBSE',
    label: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    desc: 'National curriculum — most common across India',
  },
  {
    value: 'ICSE',
    label: 'ICSE',
    fullName: 'Indian Certificate of Secondary Education',
    desc: 'Council for the Indian School Certificate Examinations',
  },
]

const QUESTIONS = [
  {
    id: 1,
    question: 'When learning something new, you prefer to...',
    options: [
      { label: 'See diagrams, charts, or visual examples', style: 'VISUAL' },
      { label: 'Hear it explained step by step', style: 'AUDITORY' },
      { label: 'Try it yourself with examples', style: 'KINESTHETIC' },
      { label: 'Read detailed notes and definitions', style: 'READING_WRITING' },
    ],
  },
  {
    id: 2,
    question: 'When you forget something, you usually...',
    options: [
      { label: 'Picture it in your head', style: 'VISUAL' },
      { label: 'Remember what someone said about it', style: 'AUDITORY' },
      { label: 'Remember what you were doing', style: 'KINESTHETIC' },
      { label: 'Remember what you wrote down', style: 'READING_WRITING' },
    ],
  },
  {
    id: 3,
    question: 'When solving a math problem, you...',
    options: [
      { label: 'Draw it out or use a number line', style: 'VISUAL' },
      { label: 'Talk through the steps out loud', style: 'AUDITORY' },
      { label: 'Work through it step by step physically', style: 'KINESTHETIC' },
      { label: 'Write out all the steps carefully', style: 'READING_WRITING' },
    ],
  },
  {
    id: 4,
    question: 'In class, you learn best when the teacher...',
    options: [
      { label: 'Uses the whiteboard with colors and diagrams', style: 'VISUAL' },
      { label: 'Explains clearly with good voice and tone', style: 'AUDITORY' },
      { label: 'Does activities and experiments', style: 'KINESTHETIC' },
      { label: 'Gives printed notes to follow along', style: 'READING_WRITING' },
    ],
  },
  {
    id: 5,
    question: 'When studying, you prefer to...',
    options: [
      { label: 'Use mind maps and highlighted notes', style: 'VISUAL' },
      { label: 'Record yourself and listen back', style: 'AUDITORY' },
      { label: 'Solve practice problems continuously', style: 'KINESTHETIC' },
      { label: 'Read the textbook and write summaries', style: 'READING_WRITING' },
    ],
  },
  {
    id: 6,
    question: 'Real-world problems feel most natural to you when...',
    options: [
      { label: 'You can see them drawn or mapped out', style: 'VISUAL' },
      { label: 'Someone explains the context to you', style: 'AUDITORY' },
      { label: 'You physically act them out', style: 'KINESTHETIC' },
      { label: 'You read all the details carefully', style: 'READING_WRITING' },
    ],
  },
  {
    id: 7,
    question: 'After a good lesson, you feel like you learned because you...',
    options: [
      { label: 'Saw clear visuals and examples', style: 'VISUAL' },
      { label: 'Heard the concept explained well', style: 'AUDITORY' },
      { label: 'Got to practice and do things', style: 'KINESTHETIC' },
      { label: 'Read and wrote about the topic', style: 'READING_WRITING' },
    ],
  },
  {
    id: 8,
    question: 'When you get stuck on a problem, your first instinct is to...',
    options: [
      { label: 'Draw it out or look at a picture', style: 'VISUAL' },
      { label: 'Talk it through with someone', style: 'AUDITORY' },
      { label: 'Try different approaches until one works', style: 'KINESTHETIC' },
      { label: 'Read the instructions again carefully', style: 'READING_WRITING' },
    ],
  },
  {
    id: 9,
    question: 'Your ideal exam format would be...',
    options: [
      { label: 'Diagrams, graphs, and visual problems', style: 'VISUAL' },
      { label: 'Verbal questions you can answer aloud', style: 'AUDITORY' },
      { label: 'Practical tasks and demonstrations', style: 'KINESTHETIC' },
      { label: 'Written questions and essays', style: 'READING_WRITING' },
    ],
  },
  {
    id: 10,
    question: 'When a concept finally "clicks" for you, it\'s usually because...',
    options: [
      { label: 'You saw it represented visually', style: 'VISUAL' },
      { label: 'Someone said it in just the right way', style: 'AUDITORY' },
      { label: 'You tried it and it worked', style: 'KINESTHETIC' },
      { label: 'You read an explanation that made sense', style: 'READING_WRITING' },
    ],
  },
]

type StyleKey = 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING_WRITING'
type Step = 'board' | 'quiz'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('board')
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<StyleKey[]>([])
  const [saving, setSaving] = useState(false)

  function confirmBoard() {
    if (!selectedBoard) return
    setStep('quiz')
  }

  function selectOption(style: StyleKey) {
    const newAnswers = [...answers, style]
    setAnswers(newAnswers)

    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300)
    } else {
      finishQuiz(newAnswers)
    }
  }

  async function finishQuiz(finalAnswers: StyleKey[]) {
    setSaving(true)
    const counts: Record<StyleKey, number> = { VISUAL: 0, AUDITORY: 0, KINESTHETIC: 0, READING_WRITING: 0 }
    finalAnswers.forEach((s) => counts[s]++)
    const detectedStyle = (Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0]) as StyleKey

    await fetch('/api/student/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningStyle: detectedStyle, board: selectedBoard }),
    })

    router.push('/')
  }

  if (step === 'board') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Samastey</h1>
            <p className="mt-1 text-gray-500">Which board are you studying under?</p>
          </div>

          <div className="space-y-3">
            {BOARDS.map((b) => (
              <button
                key={b.value}
                onClick={() => setSelectedBoard(b.value)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  selectedBoard === b.value
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                    : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-800 dark:bg-gray-900'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn(
                      'font-semibold',
                      selectedBoard === b.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'
                    )}>
                      {b.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.fullName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.desc}</p>
                  </div>
                  {selectedBoard === b.value && (
                    <span className="text-orange-500 text-lg">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={confirmBoard}
            disabled={!selectedBoard}
            className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    )
  }

  const question = QUESTIONS[currentQ]
  const progress = (currentQ / QUESTIONS.length) * 100

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Let&apos;s find your learning style
          </h1>
          <p className="mt-1 text-gray-500">10 quick questions to personalize your experience</p>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-orange-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-orange-500">
              Question {currentQ + 1} of {QUESTIONS.length}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              {question.question}
            </h2>

            <div className="mt-5 space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.style}
                  onClick={() => selectOption(option.style as StyleKey)}
                  disabled={saving}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition-all hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-orange-950 dark:hover:text-orange-300"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-gray-400">
          {QUESTIONS.length - currentQ - 1} questions remaining
        </p>
      </div>
    </div>
  )
}
