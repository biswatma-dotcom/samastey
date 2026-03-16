'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin',            label: 'Overview',   icon: '◈' },
  { href: '/admin/users',      label: 'Users',      icon: '◉' },
  { href: '/admin/subjects',   label: 'Subjects',   icon: '◧' },
  { href: '/admin/api-config', label: 'API Config', icon: '◎' },
]

export function AdminNav({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <nav className="flex gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded px-2 py-1 text-xs font-medium transition-colors',
              pathname === l.href
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-gray-400 hover:text-gray-100'
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-0.5 p-3 pt-4">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === l.href
              ? 'bg-orange-500/15 text-orange-400'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
          )}
        >
          <span className="text-base leading-none">{l.icon}</span>
          {l.label}
        </Link>
      ))}
      <div className="mt-4 border-t border-gray-800 pt-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to App
        </Link>
      </div>
    </nav>
  )
}
