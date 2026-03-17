'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

interface GradeFilterProps {
  currentGrade: number
  studentGrade: number
}

export function GradeFilter({ currentGrade, studentGrade }: GradeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setGrade(grade: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (grade === studentGrade) {
      params.delete('grade')
    } else {
      params.set('grade', String(grade))
    }
    const qs = params.toString()
    router.push(pathname + (qs ? `?${qs}` : ''))
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 shrink-0">Class:</span>
      <div className="flex gap-1 flex-wrap">
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => setGrade(g)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border',
              g === currentGrade
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
            )}
          >
            {g}
            {g === studentGrade && g !== currentGrade && (
              <span className="ml-1 text-orange-400">•</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
