'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PracticeQuestion, EvaluationResult } from '@/types'

interface PracticeZoneProps {
  conceptId: string
  conceptTitle: string
  onScoreUpdate: (newScore: number, xpEarned: number, masteryJustUnlocked: boolean) => void
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '🟢 Easy',
  medium: '🟡 Medium',
  hard: '🔴 Hard',
}

export function PracticeZone({ conceptId, conceptTitle, onScoreUpdate }: PracticeZoneProps) {
  const [question, setQuestion] = useState<(PracticeQuestion & { id?: string; difficulty?: string }) | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [textAnswer, setTextAnswer] = useState('')
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [hints, setHints] = useState<string[]>([])
  const [hintsUsed, setHintsUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [correctStreak, setCorrectStreak] = useState(0)
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null)
  const [lastProblems, setLastProblems] = useState<string[]>([])

  async function fetchQuestion() {
    setLoading(true)
    setResult(null)
    setSelectedAnswer('')
    setTextAnswer('')
    setHints([])
    setHintsUsed(0)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000) // 90s timeout

      const res = await fetch('/api/learn/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, correctStreak, lastWasCorrect, lastProblems }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) throw new Error('Failed to fetch question')
      const data = await res.json()
      if (!data.problem) throw new Error('Invalid question data')
      setQuestion(data)
    } catch (err: any) {
      const msg = err?.name === 'AbortError' ? 'Timed out — please try again.' : 'Failed to load question. Please try again.'
      setQuestion({ problem: msg, type: 'multiple_choice', options: [], answer: '', explanation: '' } as any)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHint() {
    if (!question || hintsUsed >= 3) return
    const nextHint = hintsUsed + 1

    const res = await fetch('/api/learn/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: question.problem,
        hintNumber: nextHint,
        conceptTitle,
        studentAnswer: selectedAnswer || textAnswer,
      }),
    })
    const data = await res.json()
    setHints((prev) => [...prev, data.hint])
    setHintsUsed(nextHint)
  }

  async function submitAnswer() {
    if (!question) return
    const answer = question.type === 'multiple_choice' ? selectedAnswer : textAnswer
    if (!answer) return

    setEvaluating(true)

    const res = await fetch('/api/learn/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conceptId,
        questionId: question.id,
        studentAnswer: answer,
        hintsUsed,
        correctStreak,
      }),
    })
    const data = await res.json()
    setResult(data.evaluation)
    setEvaluating(false)

    const isCorrect = data.evaluation.isCorrect
    const newStreak = isCorrect ? correctStreak + 1 : 0
    setCorrectStreak(newStreak)
    setLastWasCorrect(isCorrect)
    setLastProblems((prev) => [...prev, question.problem].slice(-5))
    onScoreUpdate(data.masteryScore ?? 0, data.xpEarned ?? 0, data.masteryJustUnlocked ?? false)
  }

  if (!question && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <p className="text-gray-500 dark:text-gray-400">Ready to test your understanding?</p>
        <Button onClick={fetchQuestion} size="lg">
          Start Practice
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        <p className="text-sm text-gray-400">Generating question...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Difficulty badge */}
      {question!.difficulty && (
        <p className="text-xs font-medium text-gray-400">
          {DIFFICULTY_LABEL[question!.difficulty] ?? question!.difficulty}
          {correctStreak > 0 && (
            <span className="ml-2 text-orange-500">🔥 {correctStreak} streak</span>
          )}
        </p>
      )}

      <Card>
        <CardContent className="pt-5">
          <p className="font-medium text-gray-900 dark:text-gray-100">{question!.problem}</p>
        </CardContent>
      </Card>

      {/* Answer input */}
      {question!.type === 'multiple_choice' ? (
        <div className="space-y-2">
          {question!.options?.map((option) => (
            <button
              key={option}
              disabled={!!result}
              onClick={() => setSelectedAnswer(option)}
              className={cn(
                'w-full rounded-lg border px-4 py-3 text-left text-sm transition-all',
                selectedAnswer === option
                  ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                  : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900',
                result && option === question!.answer && 'border-green-500 bg-green-50 dark:bg-green-950',
                result && selectedAnswer === option && !result.isCorrect && 'border-red-400 bg-red-50 dark:bg-red-950'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={!!result}
          placeholder="Type your answer..."
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          onKeyDown={(e) => e.key === 'Enter' && !result && submitAnswer()}
        />
      )}

      {/* Hints */}
      {hints.length > 0 && (
        <div className="space-y-2">
          {hints.map((hint, i) => (
            <div key={i} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              💡 Hint {i + 1}: {hint}
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'rounded-lg p-4 text-sm',
              result.isCorrect
                ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
            )}
          >
            <p className="font-semibold">{result.isCorrect ? '✓ Correct!' : '✗ Not quite'}</p>
            <p className="mt-1">{result.feedback}</p>
            {!result.isCorrect && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs opacity-70">See explanation</summary>
                <p className="mt-1 text-xs">{question!.explanation}</p>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2">
        {!result ? (
          <>
            <Button
              onClick={submitAnswer}
              disabled={evaluating || (!selectedAnswer && !textAnswer)}
              className="flex-1"
            >
              {evaluating ? 'Checking...' : 'Submit'}
            </Button>
            {hintsUsed < 3 && (
              <Button variant="outline" onClick={fetchHint}>
                Hint ({3 - hintsUsed} left)
              </Button>
            )}
          </>
        ) : (
          <Button onClick={fetchQuestion} className="flex-1">
            Next Problem →
          </Button>
        )}
      </div>
    </div>
  )
}
