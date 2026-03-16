'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MasteryBarProps {
  score: number
  className?: string
}

export function MasteryBar({ score, className }: MasteryBarProps) {
  const isMastered = score >= 80

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Mastery</span>
        <span
          className={cn(
            'font-semibold',
            isMastered ? 'text-green-600' : 'text-orange-600'
          )}
        >
          {Math.round(score)}%
          {isMastered && ' ✓'}
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isMastered
              ? 'bg-gradient-to-r from-green-400 to-green-600'
              : score >= 50
              ? 'bg-gradient-to-r from-amber-400 to-orange-600'
              : 'bg-gradient-to-r from-orange-400 to-orange-600'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Mastery threshold marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/70 dark:bg-black/40"
          style={{ left: '80%' }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {isMastered ? 'Mastered! You can move to the next concept.' : `${80 - Math.round(score)} more points to mastery`}
      </p>
    </div>
  )
}
