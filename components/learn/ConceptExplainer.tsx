'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { StreamingResponse } from './StreamingResponse'

interface ThreadItem {
  id: string
  label: string
  content: string
  streaming: boolean
}

interface ConceptExplainerProps {
  conceptId: string
  conceptTitle: string
  objectives: { id: string; description: string }[]
}

export function ConceptExplainer({ conceptId, conceptTitle, objectives }: ConceptExplainerProps) {
  const [thread, setThread] = useState<ThreadItem[]>([])
  const [question, setQuestion] = useState('')
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isAnyStreaming = thread.some((t) => t.streaming)

  async function addExplanation(label: string, payload?: { studentQuestion?: string; previousApproach?: string }) {
    const id = crypto.randomUUID()
    setThread((prev) => [...prev, { id, label, content: '', streaming: true }])

    const res = await fetch('/api/learn/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conceptId, ...payload }),
    })

    if (!res.ok || !res.body) {
      setThread((prev) =>
        prev.map((t) => t.id === id ? { ...t, streaming: false, content: 'Failed to load explanation.' } : t)
      )
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let rafPending = false

    function scheduleUpdate() {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(() => {
        rafPending = false
        const snapshot = full
        setThread((prev) => prev.map((t) => t.id === id ? { ...t, content: snapshot } : t))
      })
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        scheduleUpdate()
      }
    } catch {
      // Stream error (e.g. API content filter or network drop)
      if (!full) {
        setThread((prev) => prev.map((t) =>
          t.id === id ? { ...t, streaming: false, content: 'Failed to generate explanation. Please try again.' } : t
        ))
        return
      }
    }

    setThread((prev) => prev.map((t) =>
      t.id === id ? { ...t, streaming: false } : t
    ))
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function handleStart() {
    setStarted(true)
    addExplanation('Explanation', undefined)
  }

  return (
    <div className="space-y-6">
      {/* Objectives checklist */}
      <div className="rounded-lg border border-orange-100 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
          Learning Objectives
        </h3>
        <ul className="space-y-1">
          {objectives.map((obj) => (
            <li key={obj.id} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="mt-0.5 text-orange-400">○</span>
              {obj.description}
            </li>
          ))}
        </ul>
      </div>

      {/* Let's Study prompt — shown before any content is generated */}
      {!started && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ready to learn <span className="font-medium text-orange-600 dark:text-orange-400">{conceptTitle}</span>?
          </p>
          <Button size="lg" onClick={handleStart} className="gap-2 px-8">
            Let&apos;s Study
          </Button>
        </div>
      )}

      {/* Thread — every entry stays on screen */}
      <div className="space-y-8">
        {thread.map((item, idx) => (
          <div key={item.id} className="space-y-3">
            {/* Section label */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                {item.label}
              </span>
              <div className="flex-1 border-t border-gray-100 dark:border-gray-800" />
            </div>

            {item.streaming && !item.content ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                </span>
                Thinking
              </div>
            ) : (
              <StreamingResponse content={item.content} isStreaming={item.streaming} />
            )}

            {/* Ask anything — only on the last completed item */}
            {!item.streaming && idx === thread.length - 1 && !isAnyStreaming && (
              <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask anything about this topic..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && question.trim()) {
                      addExplanation(question.trim(), { studentQuestion: question.trim() })
                      setQuestion('')
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={!question.trim()}
                  onClick={() => {
                    if (question.trim()) {
                      addExplanation(question.trim(), { studentQuestion: question.trim() })
                      setQuestion('')
                    }
                  }}
                >
                  Ask
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={bottomRef} />
    </div>
  )
}
