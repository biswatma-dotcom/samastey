'use client'

import { useState, useEffect } from 'react'

interface ContentStats {
  total: number
  stale: number
  byStyle: { style: string; count: number }[]
  byLanguage: { language: string; count: number }[]
}

const TOKEN_KEYS: { key: string; label: string; note: string }[] = [
  { key: 'token_explain',   label: 'Concept Explanation',  note: 'Initial explanation stream' },
  { key: 'token_alternate', label: 'Alternate Explanation', note: '"Explain Differently" stream' },
  { key: 'token_answer',    label: 'Student Q&A',           note: 'Answer student questions' },
  { key: 'token_practice',  label: 'Practice Question',     note: 'Generate MCQ / board questions' },
  { key: 'token_evaluate',  label: 'Answer Evaluation',     note: 'Evaluate student answers' },
  { key: 'token_hint',      label: 'Hint Generation',       note: 'Contextual hints' },
  { key: 'token_seed',      label: 'Concept Seeding',       note: 'Admin seeder (chapter list)' },
  { key: 'token_chat',      label: 'sarvamChat default',    note: 'Non-streaming calls' },
]

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
}

export default function AdminApiConfigPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [apiKeySet, setApiKeySet] = useState<boolean | null>(null)
  const [contentStats, setContentStats] = useState<ContentStats | null>(null)
  const [saving, setSaving] = useState(false)
  const [clearingAll, setClearingAll] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setApiKeySet(d?.sarvamKeySet ?? false)
    }).catch(() => setApiKeySet(false))

    fetch('/api/admin/settings').then((r) => r.json()).then((d) => {
      setSettings(d)
      setEdited(d)
    })

    fetch('/api/admin/content').then((r) => r.json()).then(setContentStats)
  }, [])

  function set(key: string, value: string) {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  function isDirty() {
    return Object.keys(edited).some((k) => edited[k] !== settings[k])
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edited),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSettings({ ...edited })
      setMessage({ text: 'Settings saved. Changes take effect within 5 minutes.', type: 'ok' })
    } catch (e: any) {
      setMessage({ text: e.message, type: 'err' })
    } finally {
      setSaving(false)
    }
  }

  async function clearAllCache() {
    if (!confirm('Delete ALL cached explanations? Students will need to regenerate content.')) return
    setClearingAll(true)
    const res = await fetch('/api/admin/content?all=true', { method: 'DELETE' })
    const data = await res.json()
    setMessage({ text: `Cleared ${data.deleted} cached entries.`, type: 'ok' })
    setClearingAll(false)
    fetch('/api/admin/content').then((r) => r.json()).then(setContentStats)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">API Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Model settings, token limits, and content cache management</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !isDirty()}
          className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-center justify-between ${
          message.type === 'ok'
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Model & API */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Model & API</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* Model name — editable */}
          <div className="rounded-lg bg-gray-800 p-3">
            <label className="text-xs text-gray-500 mb-1 block">Active Model</label>
            <input
              value={edited.model ?? ''}
              onChange={(e) => set('model', e.target.value)}
              className="w-full bg-transparent font-mono text-sm font-semibold text-orange-400 focus:outline-none border-b border-transparent focus:border-orange-500"
              placeholder="sarvam-30b-16k"
            />
          </div>

          {/* API key — status only, managed via Vercel */}
          <div className="rounded-lg bg-gray-800 p-3">
            <p className="text-xs text-gray-500 mb-1">Sarvam API Key</p>
            <div className="flex items-center gap-2">
              <StatusDot ok={apiKeySet ?? false} />
              <span className="text-sm text-gray-300">
                {apiKeySet === null ? 'Checking…' : apiKeySet ? 'Configured' : 'Not set'}
              </span>
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-orange-400 hover:text-orange-300"
              >
                Edit in Vercel →
              </a>
            </div>
          </div>

          {/* Streaming mode — toggle */}
          <div className="rounded-lg bg-gray-800 p-3">
            <label className="text-xs text-gray-500 mb-2 block">Streaming Mode</label>
            <div className="flex gap-2">
              {['sse', 'disabled'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => set('streaming_mode', opt)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    (edited.streaming_mode ?? 'sse') === opt
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {opt === 'sse' ? 'SSE (server-sent events)' : 'Disabled'}
                </button>
              ))}
            </div>
          </div>

          {/* Think-tag stripping — toggle */}
          <div className="rounded-lg bg-gray-800 p-3">
            <label className="text-xs text-gray-500 mb-2 block">Think-tag Stripping</label>
            <div className="flex gap-2">
              {['enabled', 'disabled'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => set('think_tag_stripping', opt)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    (edited.think_tag_stripping ?? 'enabled') === opt
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Token Limits — editable */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Token Limits</h2>
          <p className="text-xs text-gray-500 mt-0.5">Saved values take effect within 5 minutes (cached per server instance).</p>
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
              {TOKEN_KEYS.map((t) => (
                <tr key={t.key}>
                  <td className="px-4 py-2.5 font-medium text-gray-300">{t.label}</td>
                  <td className="px-4 py-2.5 text-right">
                    <input
                      type="number"
                      min={100}
                      max={32000}
                      step={500}
                      value={edited[t.key] ?? ''}
                      onChange={(e) => set(t.key, e.target.value)}
                      className="w-24 bg-gray-800 border border-gray-700 focus:border-orange-500 rounded px-2 py-1 text-right font-mono text-sm text-orange-400 focus:outline-none"
                    />
                  </td>
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
            <button
              onClick={clearAllCache}
              disabled={clearingAll || contentStats.total === 0}
              className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
            >
              {clearingAll ? 'Clearing…' : 'Clear All Cache'}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500">Loading cache stats…</p>
        )}
      </section>

      {/* Admin note */}
      <section className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
        <h2 className="text-sm font-semibold text-orange-400 mb-2">Making a User an Admin</h2>
        <pre className="mt-2 rounded-lg bg-gray-900 p-3 text-xs text-gray-300 overflow-x-auto">
{`UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';`}
        </pre>
        <p className="mt-2 text-xs text-gray-500">Or run: <code className="text-gray-400">npx prisma studio</code> and edit the User table directly.</p>
      </section>
    </div>
  )
}
