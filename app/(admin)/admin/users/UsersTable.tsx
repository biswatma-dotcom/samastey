'use client'

import { useState, useEffect, useCallback } from 'react'
import { LANGUAGE_NAMES } from '@/types'

interface StudentRow {
  id: string
  userId: string
  name: string
  email: string
  joinedAt: string
  grade: number
  board: string
  learningStyle: string
  language: string
  xpTotal: number
  streakDays: number
  lastActiveAt: string | null
  totalRecords: number
  totalSessions: number
  masteryCount: number
}

const STYLE_COLORS: Record<string, string> = {
  VISUAL: 'text-blue-400',
  AUDITORY: 'text-green-400',
  KINESTHETIC: 'text-purple-400',
  READING_WRITING: 'text-yellow-400',
  UNKNOWN: 'text-gray-500',
}

function daysAgo(date: string | null) {
  if (!date) return 'Never'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff}d ago`
}

export function UsersTable() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState('')
  const [board, setBoard] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p) })
    if (search) params.set('search', search)
    if (grade) params.set('grade', grade)
    if (board) params.set('board', board)
    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    setRows(data.data ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setPage(p)
    setLoading(false)
  }, [search, grade, board])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1)}
          placeholder="Search name or email..."
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none w-56"
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Grades</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Class {g}</option>
          ))}
        </select>
        <select
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="">All Boards</option>
          <option>CBSE</option>
          <option>ICSE</option>
          <option>STATE</option>
        </select>
        <button
          onClick={() => load(1)}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Search
        </button>
      </div>

      <p className="text-xs text-gray-500">{total} student{total !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900">
            <tr>
              {['Name', 'Grade/Board', 'Language', 'Style', 'XP', 'Streak', 'Mastered', 'Sessions', 'Last Active'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-500">No students found</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  Class {r.grade}
                  <span className="ml-1.5 rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400">{r.board}</span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {(LANGUAGE_NAMES as any)[r.language]?.split(' ')[0] ?? r.language}
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${STYLE_COLORS[r.learningStyle] ?? 'text-gray-400'}`}>
                  {r.learningStyle.replace('_', ' ')}
                </td>
                <td className="px-4 py-3 font-mono text-orange-400">{r.xpTotal.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{r.streakDays}d</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
                    {r.masteryCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{r.totalSessions}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{daysAgo(r.lastActiveAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 disabled:opacity-40 hover:border-gray-500 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= pages}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 disabled:opacity-40 hover:border-gray-500 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
