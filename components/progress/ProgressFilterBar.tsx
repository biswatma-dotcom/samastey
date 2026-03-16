'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface FilterOption {
  grade: number
  board: string
  label: string
  isCurrent: boolean
}

export function ProgressFilterBar({
  options,
  activeGrade,
  activeBoard,
}: {
  options: FilterOption[]
  activeGrade: number
  activeBoard: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setFilter(grade: number, board: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('grade', String(grade))
    params.set('board', board)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = opt.grade === activeGrade && opt.board === activeBoard
        return (
          <button
            key={opt.label}
            onClick={() => setFilter(opt.grade, opt.board)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'border-orange-500 bg-orange-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
            )}
          >
            {opt.label}
            {opt.isCurrent && (
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5',
                isActive ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
              )}>
                current
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
