'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PracticeQuestion, EvaluationResult, QuestionMode } from '@/types'

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

type StoredQuestion = PracticeQuestion & {
  id?: string
  difficulty?: string
  marks?: number
  markingScheme?: string[]
}

type BoardEvaluation = EvaluationResult & {
  marksAwarded?: number
  marksTotal?: number
  markingBreakdown?: string
}

export function PracticeZone({ conceptId, conceptTitle, onScoreUpdate }: PracticeZoneProps) {
  const [mode, setMode] = useState<QuestionMode>('mcq')
  const [question, setQuestion] = useState<StoredQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [textAnswer, setTextAnswer] = useState('')
  const [result, setResult] = useState<BoardEvaluation | null>(null)
  const [hints, setHints] = useState<string[]>([])
  const [hintsUsed, setHintsUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [correctStreak, setCorrectStreak] = useState(0)
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null)
  const [lastProblems, setLastProblems] = useState<string[]>([])

  function switchMode(newMode: QuestionMode) {
    setMode(newMode)
    setQuestion(null)
    setResult(null)
    setSelectedAnswer('')
    setTextAnswer('')
    setHints([])
    setHintsUsed(0)
  }

  async function fetchQuestion() {
    setLoading(true)
    setResult(null)
    setSelectedAnswer('')
    setTextAnswer('')
    setHints([])
    setHintsUsed(0)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90000)

      const res = await fetch('/api/learn/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, correctStreak, lastWasCorrect, lastProblems, mode }),
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

  const isBoardQuestion = question?.type?.startsWith('board_')
  const boardMarks = question?.marks ?? (isBoardQuestion ? parseInt(question!.type.split('_')[1]) : 0)

  // ── Idle state ──────────────────────────────────────────────────────────
  if (!question && !loading) {
    return (
      <div className="flex flex-col items-center gap-5 py-8">
        {/* Mode toggle */}
        <div className="flex w-full rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          <button
            onClick={() => switchMode('mcq')}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
              mode === 'mcq'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            MCQ Practice
          </button>
          <button
            onClick={() => switchMode('board')}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
              mode === 'board'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            Board Exam Style
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {mode === 'mcq'
            ? 'Multiple-choice questions with instant feedback'
            : 'Long/short answer questions graded by AI like a board examiner'}
        </p>
        <Button onClick={fetchQuestion} size="lg" className="w-full">
          Start Practice
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        <p className="text-sm text-gray-400">
          {mode === 'board' ? 'Generating board exam question...' : 'Generating question...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mode badge + difficulty */}
      <div className="flex items-center justify-between">
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
          mode === 'board'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
        )}>
          {mode === 'board' ? `📋 Board Exam • ${boardMarks} mark${boardMarks !== 1 ? 's' : ''}` : '🎯 MCQ'}
        </span>
        {mode === 'mcq' && question!.difficulty && (
          <span className="text-xs text-gray-400">
            {DIFFICULTY_LABEL[question!.difficulty] ?? question!.difficulty}
            {correctStreak > 0 && <span className="ml-2 text-orange-500">🔥 {correctStreak}</span>}
          </span>
        )}
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
            {question!.problem}
          </p>
          {isBoardQuestion && (
            <p className="mt-2 text-xs text-gray-400">
              Write a complete answer ({boardMarks} mark{boardMarks !== 1 ? 's' : ''})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Answer input */}
      {!isBoardQuestion ? (
        // MCQ options
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
        // Board exam textarea
        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={!!result}
          placeholder="Write your answer here..."
          rows={6}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 resize-y"
        />
      )}

      {/* Hints (MCQ only) */}
      {!isBoardQuestion && hints.length > 0 && (
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
            className="space-y-3"
          >
            {isBoardQuestion ? (
              // Board exam result — marks + breakdown
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                {/* Marks banner */}
                <div className={cn(
                  'mb-3 flex items-center justify-between rounded-md px-3 py-2',
                  (result.marksAwarded ?? 0) >= (result.marksTotal ?? boardMarks)
                    ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                    : (result.marksAwarded ?? 0) > 0
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                )}>
                  <span className="font-semibold text-lg">
                    {result.marksAwarded ?? 0} / {result.marksTotal ?? boardMarks} marks
                  </span>
                  <span className="text-sm font-medium">
                    {(result.marksAwarded ?? 0) >= (result.marksTotal ?? boardMarks) ? '✓ Full marks' :
                     (result.marksAwarded ?? 0) > 0 ? 'Partial credit' : 'No marks'}
                  </span>
                </div>

                {/* Examiner feedback */}
                <p className="text-sm text-gray-700 dark:text-gray-300">{result.feedback}</p>

                {/* Marking breakdown */}
                {result.markingBreakdown && (
                  <details className="mt-3" open>
                    <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      Marking breakdown
                    </summary>
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {result.markingBreakdown}
                    </p>
                  </details>
                )}

                {/* Model answer */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    Model answer
                  </summary>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {question!.answer}
                  </p>
                  {question!.markingScheme && question!.markingScheme.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {question!.markingScheme.map((point, i) => (
                        <li key={i} className="text-xs text-gray-500">• {point}</li>
                      ))}
                    </ul>
                  )}
                </details>
              </div>
            ) : (
              // MCQ result
              <div className={cn(
                'rounded-lg p-4 text-sm',
                result.isCorrect
                  ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              )}>
                <p className="font-semibold">{result.isCorrect ? '✓ Correct!' : '✗ Not quite'}</p>
                <p className="mt-1">{result.feedback}</p>
                {!result.isCorrect && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs opacity-70">See explanation</summary>
                    <p className="mt-1 text-xs">{question!.explanation}</p>
                  </details>
                )}
              </div>
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
              disabled={evaluating || (isBoardQuestion ? !textAnswer.trim() : (!selectedAnswer && !textAnswer))}
              className="flex-1"
            >
              {evaluating ? (isBoardQuestion ? 'Evaluating...' : 'Checking...') : 'Submit'}
            </Button>
            {!isBoardQuestion && hintsUsed < 3 && (
              <Button variant="outline" onClick={fetchHint}>
                Hint ({3 - hintsUsed} left)
              </Button>
            )}
          </>
        ) : (
          <Button onClick={fetchQuestion} className="flex-1">
            Next Question →
          </Button>
        )}
      </div>
    </div>
  )
}
