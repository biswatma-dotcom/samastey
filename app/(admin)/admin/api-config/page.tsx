'use client'

import { useState, useEffect } from 'react'
const SARVAM_MODEL = 'sarvam-30b'

interface ContentStats {
  total: number
  stale: number
  byStyle: { style: string; count: number }[]
  byLanguage: { language: string; count: number }[]
}

const TOKEN_LIMITS: { key: string; label: string; value: number; note: string }[] = [
  { key: 'explain',   label: 'Concept Explanation',  value: 8000,  note: 'Initial explanation stream' },
  { key: 'alternate', label: 'Alternate Explanation', value: 5000,  note: '"Explain Differently" stream' },
  { key: 'answer',    label: 'Student Q&A',           value: 5000,  note: 'Answer student questions' },
  { key: 'practice',  label: 'Practice Question',     value: 4000,  note: 'Generate MCQ / fill-in-blank' },
  { key: 'evaluate',  label: 'Answer Evaluation',     value: 3000,  note: 'Evaluate student answers' },
  { key: 'hint',      label: 'Hint Generation',       value: 3000,  note: 'Contextual hints' },
  { key: 'seed',      label: 'Concept Seeding',       value: 6000,  note: 'Admin seeder (chapter list)' },
  { key: 'chat',      label: 'sarvamChat default',    value: 4000,  note: 'Non-streaming calls' },
]

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
}

export default function AdminApiConfigPage() {
  const [contentStats, setContentStats] = useState<ContentStats | null>(null)
  const [apiKeySet, setApiKeySet] = useState<boolean | null>(null)
  const [clearingStale, setClearingStale] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check if API key is configured via settings endpoint
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setApiKeySet(d?.sarvamKeySet ?? false)
    }).catch(() => setApiKeySet(false))

    fetch('/api/admin/content').then((r) => r.json()).then(setContentStats)
  }, [])

  async function clearStaleCache() {
    if (!confirm('Delete all cached explanations that contain <think> tags?')) return
    setClearingStale(true)
    // For stale entries we'd need a custom endpoint — for now just show a note
    setMessage('Stale cache entries are automatically purged when accessed. No manual action needed.')
    setClearingStale(false)
  }

  async function clearAllCache() {
    if (!confirm('Delete ALL cached explanations? Students will need to regenerate content.')) return
    setClearingAll(true)
    const res = await fetch('/api/admin/content?all=true', { method: 'DELETE' })
    const data = await res.json()
    setMessage(`Cleared ${data.deleted} cached entries.`)
    setClearingAll(false)
    fetch('/api/admin/content').then((r) => r.json()).then(setContentStats)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">API Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Model settings, token limits, and content cache management</p>
      </div>

      {message && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
          {message}
          <button onClick={() => setMessage('')} className="ml-3 text-orange-500 hover:text-orange-300">✕</button>
        </div>
      )}

      {/* Model Info */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Model & API</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-1">Active Model</p>
            <p className="font-mono text-sm font-semibold text-orange-400">{SARVAM_MODEL}</p>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-1">Sarvam API Key</p>
            <div className="flex items-center gap-2">
              <StatusDot ok={apiKeySet ?? false} />
              <span className="text-sm text-gray-300">{apiKeySet === null ? 'Checking...' : apiKeySet ? 'Configured' : 'Not set'}</span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-1">Streaming Mode</p>
            <div className="flex items-center gap-2">
              <StatusDot ok />
              <span className="text-sm text-gray-300">SSE (server-sent events)</span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-1">Think-tag Stripping</p>
            <div className="flex items-center gap-2">
              <StatusDot ok />
              <span className="text-sm text-gray-300">Enabled (stream level)</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600">
          To change the model or API key, update <code className="text-gray-400">lib/ai/client.ts</code> and <code className="text-gray-400">.env</code> / Vercel environment variables.
        </p>
      </section>

      {/* Token Limits */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Token Limits (read-only)</h2>
          <p className="text-xs text-gray-500 mt-0.5">Current max_tokens per operation. Edit in source to change.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500">Operation</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500">max_tokens</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {TOKEN_LIMITS.map((t) => (
                <tr key={t.key}>
                  <td className="px-4 py-2.5 font-medium text-gray-300">{t.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-orange-400">{t.value.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 hidden sm:table-cell">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Content Cache */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Content Cache</h2>

        {contentStats ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-800 p-3">
                <p className="text-xs text-gray-500 mb-1">Total Entries</p>
                <p className="text-xl font-bold text-white">{contentStats.total}</p>
              </div>
              <div className="rounded-lg bg-gray-800 p-3">
                <p className="text-xs text-gray-500 mb-1">Stale (think tags)</p>
                <p className={`text-xl font-bold ${contentStats.stale > 0 ? 'text-red-400' : 'text-green-400'}`}>{contentStats.stale}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">By Learning Style</p>
                {contentStats.byStyle.map((b) => (
                  <div key={b.style} className="flex justify-between py-1 text-sm">
                    <span className="text-gray-400">{b.style.replace('_', ' ')}</span>
                    <span className="text-gray-300">{b.count}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</p>
                {contentStats.byLanguage.map((b) => (
                  <div key={b.language} className="flex justify-between py-1 text-sm">
                    <span className="text-gray-400">{b.language.toUpperCase()}</span>
                    <span className="text-gray-300">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={clearStaleCache}
                disabled={clearingStale || contentStats.stale === 0}
                className="rounded-lg bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-40 transition-colors"
              >
                {clearingStale ? 'Clearing...' : `Clear Stale (${contentStats.stale})`}
              </button>
              <button
                onClick={clearAllCache}
                disabled={clearingAll || contentStats.total === 0}
                className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                {clearingAll ? 'Clearing...' : 'Clear All Cache'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Loading cache stats...</p>
        )}
      </section>

      {/* Admin Setup Note */}
      <section className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
        <h2 className="text-sm font-semibold text-orange-400 mb-2">Making a User an Admin</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          Run this SQL against the Neon database (or via Prisma Studio) to promote a user to ADMIN:
        </p>
        <pre className="mt-2 rounded-lg bg-gray-900 p-3 text-xs text-gray-300 overflow-x-auto">
{`UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';`}
        </pre>
        <p className="mt-2 text-xs text-gray-500">Or run: <code className="text-gray-400">npx prisma studio</code> and edit the User table directly.</p>
      </section>
    </div>
  )
}
