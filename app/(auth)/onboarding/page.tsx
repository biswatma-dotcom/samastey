'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    if (!selectedBoard) return
    setSaving(true)
    await fetch('/api/student/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningStyle: 'UNKNOWN', board: selectedBoard }),
    })
    router.push('/')
  }

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
          onClick={handleContinue}
          disabled={!selectedBoard || saving}
          className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Setting up...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
