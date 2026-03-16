'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MasteryBar } from '@/components/learn/MasteryBar'

// Both components use framer-motion — keep out of the initial page bundle
const PracticeZone = dynamic(
  () => import('@/components/learn/PracticeZone').then((m) => ({ default: m.PracticeZone })),
  { ssr: false, loading: () => (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  )}
)
const MasteryCelebration = dynamic(
  () => import('@/components/learn/MasteryCelebration').then((m) => ({ default: m.MasteryCelebration })),
  { ssr: false }
)

interface Props {
  conceptId: string
  conceptTitle: string
  initialMasteryScore: number
}

export function PracticeZoneWrapper({ conceptId, conceptTitle, initialMasteryScore }: Props) {
  const [masteryScore, setMasteryScore] = useState(initialMasteryScore)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationXP, setCelebrationXP] = useState(0)

  function handleScoreUpdate(newScore: number, xpEarned: number, masteryJustUnlocked: boolean) {
    setMasteryScore(newScore)
    if (masteryJustUnlocked) {
      setCelebrationXP(xpEarned)
      setShowCelebration(true)
    }
  }

  return (
    <div className="space-y-4">
      <MasteryBar score={masteryScore} />
      <PracticeZone
        conceptId={conceptId}
        conceptTitle={conceptTitle}
        onScoreUpdate={handleScoreUpdate}
      />
      <MasteryCelebration
        show={showCelebration}
        conceptTitle={conceptTitle}
        xpEarned={celebrationXP}
        onDismiss={() => setShowCelebration(false)}
      />
    </div>
  )
}
