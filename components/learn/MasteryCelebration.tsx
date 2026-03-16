'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MasteryCelebrationProps {
  show: boolean
  conceptTitle: string
  xpEarned: number
  onDismiss: () => void
}

export function MasteryCelebration({ show, conceptTitle, xpEarned, onDismiss }: MasteryCelebrationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 4000)
      return () => clearTimeout(timer)
    }
  }, [show, onDismiss])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ y: 20 }}
            animate={{ y: 0 }}
            className="mx-4 rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-900"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="text-6xl"
            >
              🏆
            </motion.div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              Concept Mastered!
            </h2>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{conceptTitle}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-amber-800">
              <span className="font-bold">+{xpEarned} XP</span>
              <span className="text-amber-600">earned</span>
            </div>
            <p className="mt-4 text-sm text-gray-400">Next concept unlocked →</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
