'use client'

import { motion } from 'framer-motion'

interface StreakWidgetProps {
  streakDays: number
  xpTotal: number
}

export function StreakWidget({ streakDays, xpTotal }: StreakWidgetProps) {
  return (
    <div className="flex items-center gap-6">
      <motion.div
        className="flex items-center gap-2"
        animate={streakDays > 0 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.4 }}
      >
        <span className="text-2xl">🔥</span>
        <div>
          <p className="text-xl font-bold text-orange-500">{streakDays}</p>
          <p className="text-xs text-gray-500">day streak</p>
        </div>
      </motion.div>
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <div>
          <p className="text-xl font-bold text-amber-500">{xpTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">total XP</p>
        </div>
      </div>
    </div>
  )
}
