'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const STEPS = ['grade', 'board', 'language', 'pace'] as const
type Step = typeof STEPS[number]

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

const BOARDS = [
  { value: 'CBSE', label: 'CBSE', sub: 'Central Board of Secondary Education' },
  { value: 'ICSE', label: 'ICSE', sub: 'Indian Certificate of Secondary Education' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { value: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { value: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { value: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { value: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
  { value: 'bn', label: 'বাংলা', sub: 'Bengali' },
  { value: 'mr', label: 'मराठी', sub: 'Marathi' },
  { value: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
]

const PACES = [
  {
    value: 'SLOW',
    label: 'Step by step',
    desc: 'Break everything into small pieces. Pause often to check understanding.',
    icon: '🐢',
  },
  {
    value: 'MEDIUM',
    label: 'Balanced',
    desc: 'Cover concepts clearly without going too fast or too slow.',
    icon: '⚖️',
  },
  {
    value: 'FAST',
    label: 'Quick and concise',
    desc: 'Skip the basics. Focus on what matters most.',
    icon: '⚡',
  },
]

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  grade:    { title: 'Which class are you in?',        subtitle: 'We\'ll align content to your syllabus' },
  board:    { title: 'Which board do you follow?',     subtitle: 'NCERT or ICSE textbook alignment' },
  language: { title: 'Preferred language',             subtitle: 'Explanations will be in this language' },
  pace:     { title: 'How do you like to learn?',      subtitle: 'We\'ll adjust how we explain things' },
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40'
          : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-700'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">{children}</div>
        {selected && <span className="text-orange-500 shrink-0">✓</span>}
      </div>
    </button>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 w-full">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full transition-all',
            i <= step ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-800'
          )}
        />
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [grade, setGrade] = useState<number | null>(null)
  const [board, setBoard] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>('en')
  const [pace, setPace] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const currentStep = STEPS[step]
  const meta = STEP_META[currentStep]

  const canContinue =
    (currentStep === 'grade' && grade !== null) ||
    (currentStep === 'board' && board !== null) ||
    (currentStep === 'language') ||
    (currentStep === 'pace' && pace !== null)

  async function handleContinue() {
    if (!canContinue) return
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    // Final step — save
    setSaving(true)
    await fetch('/api/student/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learningStyle: 'UNKNOWN',
        board,
        grade,
        language,
        learningPace: pace,
      }),
    })
    router.push('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-orange-500 uppercase tracking-widest">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{meta.title}</h1>
          <p className="text-sm text-gray-500">{meta.subtitle}</p>
        </div>

        <ProgressBar step={step} />

        {/* Step content */}
        <div>
          {currentStep === 'grade' && (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={cn(
                    'rounded-xl border py-3 text-sm font-semibold transition-all',
                    grade === g
                      ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'board' && (
            <div className="space-y-3">
              {BOARDS.map((b) => (
                <OptionCard key={b.value} selected={board === b.value} onClick={() => setBoard(b.value)}>
                  <p className={cn('font-semibold', board === b.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white')}>
                    {b.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.sub}</p>
                </OptionCard>
              ))}
            </div>
          )}

          {currentStep === 'language' && (
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all',
                    language === l.value
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40'
                      : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-800 dark:bg-gray-900'
                  )}
                >
                  <p className={cn('font-semibold text-sm', language === l.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white')}>
                    {l.label}
                  </p>
                  {l.sub && <p className="text-xs text-gray-500 mt-0.5">{l.sub}</p>}
                </button>
              ))}
            </div>
          )}

          {currentStep === 'pace' && (
            <div className="space-y-3">
              {PACES.map((p) => (
                <OptionCard key={p.value} selected={pace === p.value} onClick={() => setPace(p.value)}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{p.icon}</span>
                    <div>
                      <p className={cn('font-semibold', pace === p.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white')}>
                        {p.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                    </div>
                  </div>
                </OptionCard>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 transition-all"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue || saving}
            className="flex-1 rounded-xl bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Setting up...' : step < STEPS.length - 1 ? 'Continue →' : 'Start Learning →'}
          </button>
        </div>
      </div>
    </div>
  )
}
