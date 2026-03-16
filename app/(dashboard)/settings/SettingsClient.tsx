'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LANGUAGE_NAMES, Language } from '@/types'

const LANGUAGES = Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value: value as Language, label }))

const LEARNING_STYLES = [
  { value: 'VISUAL', label: 'Visual', icon: '👁️', desc: 'Diagrams, tables, spatial examples' },
  { value: 'AUDITORY', label: 'Auditory', icon: '🎵', desc: 'Verbal walkthroughs, mnemonics' },
  { value: 'KINESTHETIC', label: 'Hands-On', icon: '✋', desc: 'Step-by-step, real-world problems' },
  { value: 'READING_WRITING', label: 'Reader/Writer', icon: '📖', desc: 'Structured notes, definitions' },
]

const PACES = [
  { value: 'SLOW', label: 'Slow', icon: '🐢', desc: 'Small steps, detailed explanations' },
  { value: 'MEDIUM', label: 'Medium', icon: '🚶', desc: 'Balanced depth and pace' },
  { value: 'FAST', label: 'Fast', icon: '🚀', desc: 'Concise, skip obvious steps' },
]

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

const BOARDS = [
  { value: 'CBSE', label: 'CBSE', desc: 'Central Board of Secondary Education' },
  { value: 'ICSE', label: 'ICSE', desc: 'Indian Certificate of Secondary Education' },
]

interface Props {
  student: {
    id: string
    name: string
    email: string
    grade: number
    board: string
    learningStyle: string
    learningPace: string
    language: string
    xpTotal: number
    streakDays: number
  }
}

export function SettingsClient({ student }: Props) {
  const router = useRouter()
  const [learningStyle, setLearningStyle] = useState(student.learningStyle)
  const [learningPace, setLearningPace] = useState(student.learningPace)
  const [grade, setGrade] = useState(student.grade)
  const [board, setBoard] = useState(student.board)
  const [language, setLanguage] = useState(student.language)
  // Track last-saved values so hasChanges stays accurate after router.refresh()
  const [savedGrade, setSavedGrade] = useState(student.grade)
  const [savedBoard, setSavedBoard] = useState(student.board)
  const [savedStyle, setSavedStyle] = useState(student.learningStyle)
  const [savedPace, setSavedPace] = useState(student.learningPace)
  const [savedLanguage, setSavedLanguage] = useState(student.language)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Profile fields
  const [name, setName] = useState(student.name)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  async function handleProfileSave() {
    setProfileError('')
    setProfileSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name !== student.name ? name : undefined,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
      }),
    })
    const data = await res.json()
    setProfileSaving(false)
    if (!res.ok) {
      setProfileError(data.error ?? 'Failed to save')
    } else {
      setProfileSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setProfileSaved(false), 3000)
      router.refresh()
    }
  }

  const hasProfileChanges = name !== student.name || !!newPassword

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setSaveError('')

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningStyle, learningPace, grade, board, language }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ?? 'Failed to save. Please try again.')
      return
    }

    // Update committed baseline so hasChanges resets correctly
    setSavedGrade(grade)
    setSavedBoard(board)
    setSavedStyle(learningStyle)
    setSavedPace(learningPace)
    setSavedLanguage(language)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const hasChanges =
    learningStyle !== savedStyle ||
    learningPace !== savedPace ||
    grade !== savedGrade ||
    board !== savedBoard ||
    language !== savedLanguage

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your learning preferences and account</p>
      </div>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium">{student.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium">{student.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-500">Stats</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-amber-500 font-medium">⚡ {student.xpTotal.toLocaleString()} XP</span>
              <span className="text-orange-500 font-medium">🔥 {student.streakDays} days</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile — editable name + password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Update your name or change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to change password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          {profileError && <p className="text-sm text-red-500">{profileError}</p>}
          {profileSaved && <p className="text-sm text-green-600 font-medium">✓ Profile updated</p>}
          {hasProfileChanges && (
            <Button onClick={handleProfileSave} disabled={profileSaving} size="sm">
              {profileSaving ? 'Saving...' : 'Update Profile'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grade</CardTitle>
          <CardDescription>Changing your grade resets subject recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={cn(
                  'h-9 w-9 rounded-lg border text-sm font-medium transition-all',
                  grade === g
                    ? 'border-orange-500 bg-orange-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Board */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Board</CardTitle>
          <CardDescription>Your curriculum board</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {BOARDS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBoard(b.value)}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-3 text-left transition-all',
                board === b.value
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                  : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900'
              )}
            >
              <p className={cn(
                'text-sm font-semibold',
                board === b.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-gray-100'
              )}>
                {b.label}
              </p>
              <p className="text-xs text-gray-500">{b.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
          <CardDescription>Language for AI explanations and responses</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all',
                language === lang.value
                  ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
              )}
            >
              {language === lang.value && <span className="text-orange-500">✓</span>}
              <span>{lang.label}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Learning style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning Style</CardTitle>
          <CardDescription>How Samastey explains concepts to you</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {LEARNING_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setLearningStyle(style.value)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                learningStyle === style.value
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                  : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900'
              )}
            >
              <span className="text-xl">{style.icon}</span>
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  learningStyle === style.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-gray-100'
                )}>
                  {style.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{style.desc}</p>
              </div>
              {learningStyle === style.value && (
                <span className="ml-auto text-orange-500 text-sm">✓</span>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Learning pace */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learning Pace</CardTitle>
          <CardDescription>Controls explanation length and detail level</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {PACES.map((pace) => (
            <button
              key={pace.value}
              onClick={() => setLearningPace(pace.value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all',
                learningPace === pace.value
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                  : 'border-gray-200 bg-white hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900'
              )}
            >
              <span className="text-2xl">{pace.icon}</span>
              <p className={cn(
                'text-sm font-semibold',
                learningPace === pace.value ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-gray-100'
              )}>
                {pace.label}
              </p>
              <p className="text-xs text-gray-500">{pace.desc}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Save button */}
      {hasChanges && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setLearningStyle(savedStyle)
              setLearningPace(savedPace)
              setGrade(savedGrade)
              setBoard(savedBoard)
              setLanguage(savedLanguage)
              setSaveError('')
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {saved && (
        <p className="text-sm text-green-600 font-medium">✓ Settings saved successfully</p>
      )}
      {saveError && (
        <p className="text-sm text-red-500">{saveError}</p>
      )}

    </div>
  )
}
