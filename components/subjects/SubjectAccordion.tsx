'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Concept {
  id: string
  title: string
  estimatedMinutes: number
  mastered: boolean
  inProgress: boolean
  masteryScore: number
}

interface SubjectGroup {
  id: string
  name: string
  concepts: Concept[]
  masteredCount: number
  totalCount: number
}

export function SubjectAccordion({ subjects }: { subjects: SubjectGroup[] }) {
  // Default: all collapsed
  const [open, setOpen] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function expandAll() {
    setOpen(Object.fromEntries(subjects.map((s) => [s.id, true])))
  }

  function collapseAll() {
    setOpen({})
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={expandAll}
          className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
        >
          Expand all
        </button>
        <span className="text-gray-200 dark:text-gray-700">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
        >
          Collapse all
        </button>
      </div>

      {subjects.map((subject) => {
        const isOpen = !!open[subject.id]
        const pct = subject.totalCount > 0
          ? Math.round((subject.masteredCount / subject.totalCount) * 100)
          : 0

        return (
          <div
            key={subject.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
          >
            {/* Header — click to toggle */}
            <button
              onClick={() => toggle(subject.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {/* Chevron */}
              <span
                className={cn(
                  'text-gray-400 transition-transform duration-200 text-sm',
                  isOpen && 'rotate-90'
                )}
              >
                ▶
              </span>

              {/* Name + mini progress */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {subject.name}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {subject.masteredCount}/{subject.totalCount} mastered
                  </span>
                </div>
              </div>

              {/* Percent badge */}
              <span
                className={cn(
                  'text-sm font-semibold shrink-0',
                  pct === 100 ? 'text-green-600' : pct > 0 ? 'text-orange-600' : 'text-gray-400'
                )}
              >
                {pct}%
              </span>
            </button>

            {/* Concept list */}
            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
                {subject.concepts.map((concept) => (
                  <Link
                    key={concept.id}
                    href={`/learn/${concept.id}`}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3 transition-all',
                      concept.mastered
                        ? 'bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-950/60'
                        : concept.inProgress
                        ? 'bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <span className="text-base shrink-0">
                      {concept.mastered ? '✅' : concept.inProgress ? '📖' : '⭕'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          concept.mastered
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {concept.title}
                      </p>
                      <p className="text-xs text-gray-400">~{concept.estimatedMinutes} min</p>
                    </div>
                    {concept.mastered && (
                      <span className="text-xs text-green-600 font-medium shrink-0">Mastered</span>
                    )}
                    {concept.inProgress && (
                      <span className="text-xs text-orange-600 font-medium shrink-0">
                        {Math.round(concept.masteryScore)}%
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
