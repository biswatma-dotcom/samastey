'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { signIn } from 'next-auth/react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    // Auto sign in
    await signIn('credentials', { email, password, redirect: false })
    router.push('/onboarding')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent">Samastey</h1>
          <p className="mt-2 text-gray-500">Start your personalized learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {[
            { label: 'Full name', value: name, setter: setName, type: 'text' },
            { label: 'Email', value: email, setter: setEmail, type: 'email' },
            { label: 'Password', value: password, setter: setPassword, type: 'password' },
          ].map(({ label, value, setter, type }) => (
            <div key={label} className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                required
                minLength={type === 'password' ? 8 : undefined}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          ))}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-orange-600 hover:text-orange-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
