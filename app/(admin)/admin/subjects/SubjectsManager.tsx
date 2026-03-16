'use client'

import { useState, useEffect, useCallback } from 'react'

interface SubjectRow {
  id: string
  name: string
  code: string
  grade: number
  board: string
  conceptCount: number
  contentCount: number
  questionCount: number
}

interface SeedLog {
  type: 'start' | 'progress' | 'skip' | 'done' | 'error'
  message?: string
  subject?: string
  count?: number
  success?: boolean
  concepts?: string[]
}

function StatusBadge({ count }: { count: number }) {
  if (count === 0) return <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">Not seeded</span>
  return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">{count} concepts</span>
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [board, setBoard] = useState('')
  const [grade, setGrade] = useState('')

  // Seeding state
  const [seedingId, setSeedingId] = useState<string | null>(null)
  const [seedLogs, setSeedLogs] = useState<SeedLog[]>([])
  const [seedTarget, setSeedTarget] = useState<string>('')

  // Delete / clear cache state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingId, setClearingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (board) params.set('board', board)
    if (grade) params.set('grade', grade)
    const res = await fetch(`/api/admin/subjects?${params}`)
    const data = await res.json()
    setSubjects(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [board, grade])

  useEffect(() => { load() }, [load])

  async function seedSubject(s: SubjectRow) {
    setSeedingId(s.id)
    setSeedTarget(s.name)
    setSeedLogs([])

    const res = await fetch('/api/admin/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId: s.id }),
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          const evt: SeedLog = JSON.parse(line)
          setSeedLogs((prev) => [...prev, evt])
          if (evt.type === 'done') {
            setSeedingId(null)
            load()
          }
        } catch { /* skip */ }
      }
    }
    setSeedingId(null)
  }

  async function deleteConceptsForSubject(s: SubjectRow) {
    if (!confirm(`Delete all ${s.conceptCount} concepts for "${s.name}"? This cannot be undone.`)) return
    setDeletingId(s.id)
    await fetch(`/api/admin/seed?subjectId=${s.id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  async function clearCacheForSubject(s: SubjectRow) {
    if (!confirm(`Clear all cached explanations for "${s.name}"?`)) return
    setClearingId(s.id)
    await fetch(`/api/admin/content?subjectId=${s.id}`, { method: 'DELETE' })
    setClearingId(null)
    load()
  }

  const unseeded = subjects.filter((s) => s.conceptCount === 0)
  const seeded = subjects.filter((s) => s.conceptCount > 0)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={board} onChange={(e) => setBoard(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">All Boards</option>
          <option>CBSE</option>
          <option>ICSE</option>
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
          <option value="">All Grades</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Class {g}</option>
          ))}
        </select>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-400">{seeded.length} seeded</span>
          <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-400">{unseeded.length} pending</span>
        </div>
      </div>

      {/* Seed progress modal */}
      {(seedingId || seedLogs.length > 0) && (
        <div className="rounded-xl border border-orange-500/30 bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Seeding: <span className="text-orange-400">{seedTarget}</span>
            </h3>
            {!seedingId && (
              <button onClick={() => setSeedLogs([])} className="text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
            )}
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {seedLogs.map((log, i) => (
              <div key={i} className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'done' && log.success ? 'text-green-400' :
                log.type === 'skip' ? 'text-yellow-400' :
                'text-gray-400'
              }>
                {log.type === 'start' && `▶ Starting seed for ${log.subject} (Class ${log.grade} ${log.board})`}
                {log.type === 'progress' && `  · ${log.message}`}
                {log.type === 'skip' && `⚠ ${log.message}`}
                {log.type === 'error' && `✗ Error: ${log.message}`}
                {log.type === 'done' && log.success && `✓ Done — ${log.count} concepts created`}
                {log.type === 'done' && !log.success && log.type === 'done' && '✗ Seeding failed'}
              </div>
            ))}
            {seedingId && (
              <div className="flex items-center gap-2 text-orange-400 mt-1">
                <span className="inline-flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
                Processing...
              </div>
            )}
            {/* Show concept list if done */}
            {seedLogs.find((l) => l.type === 'done' && l.success && l.concepts) && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <p className="text-gray-500 mb-1">Created concepts:</p>
                {seedLogs.find((l) => l.concepts)!.concepts!.map((c, i) => (
                  <div key={i} className="text-gray-400">  {i + 1}. {c}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              {['Subject', 'Grade', 'Board', 'Status', 'Content', 'Questions', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">Loading...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-500">No subjects found</td></tr>
            ) : subjects.map((s) => (
              <tr key={s.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-gray-600">{s.code}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">Class {s.grade}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">{s.board}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge count={s.conceptCount} /></td>
                <td className="px-4 py-3 text-gray-400">{s.contentCount}</td>
                <td className="px-4 py-3 text-gray-400">{s.questionCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {s.conceptCount === 0 ? (
                      <button
                        onClick={() => seedSubject(s)}
                        disabled={!!seedingId}
                        className="rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/25 disabled:opacity-40 transition-colors"
                      >
                        {seedingId === s.id ? 'Seeding...' : '⚡ Seed'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => clearCacheForSubject(s)}
                          disabled={!!clearingId || s.contentCount === 0}
                          className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 disabled:opacity-40 transition-colors"
                        >
                          {clearingId === s.id ? 'Clearing...' : '🗑 Clear Cache'}
                        </button>
                        <button
                          onClick={() => deleteConceptsForSubject(s)}
                          disabled={!!deletingId}
                          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === s.id ? 'Deleting...' : '✕ Re-seed'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
