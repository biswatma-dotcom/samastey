'use client'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

export function ProgressRing({ percent, size = 80, strokeWidth = 8, className, label }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  const color = percent >= 80 ? '#22c55e' : percent >= 50 ? '#f59e0b' : '#4f46e5'

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-100 dark:text-gray-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span className="absolute top-1/2 -translate-y-1/2 text-sm font-bold text-gray-800 dark:text-gray-200">
        {Math.round(percent)}%
      </span>
      {label && <span className="mt-1 text-xs text-gray-500">{label}</span>}
    </div>
  )
}
