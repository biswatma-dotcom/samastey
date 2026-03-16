'use client'

import { useState } from 'react'
import { PracticeZone } from '@/components/learn/PracticeZone'
import { MasteryBar } from '@/components/learn/MasteryBar'
import { MasteryCelebration } from '@/components/learn/MasteryCelebration'

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
