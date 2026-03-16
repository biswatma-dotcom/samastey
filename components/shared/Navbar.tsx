'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={session ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent">Samastey</span>
          <span className="hidden text-xs text-gray-400 sm:block">Your AI School</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-orange-600 dark:text-gray-400">
                Dashboard
              </Link>
              <Link href="/subjects" className="text-sm text-gray-600 hover:text-orange-600 dark:text-gray-400">
                Subjects
              </Link>
              <Link href="/progress" className="text-sm text-gray-600 hover:text-orange-600 dark:text-gray-400">
                Progress
              </Link>
              <Link href="/settings" className="text-sm text-gray-600 hover:text-orange-600 dark:text-gray-400">
                Settings
              </Link>
              {(session.user as any)?.role === 'ADMIN' && (
                <Link href="/admin" className="rounded-md bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-500 hover:bg-orange-500/20 transition-colors">
                  Admin
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
