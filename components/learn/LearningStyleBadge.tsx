import { Badge } from '@/components/ui/badge'

const STYLE_CONFIG = {
  VISUAL: { label: 'Visual Learner', icon: '👁️', variant: 'default' as const },
  AUDITORY: { label: 'Auditory Learner', icon: '🎵', variant: 'secondary' as const },
  KINESTHETIC: { label: 'Hands-On Learner', icon: '✋', variant: 'success' as const },
  READING_WRITING: { label: 'Reader/Writer', icon: '📖', variant: 'outline' as const },
  UNKNOWN: { label: 'Style Detecting...', icon: '🔍', variant: 'outline' as const },
}

interface LearningStyleBadgeProps {
  style: keyof typeof STYLE_CONFIG
}

export function LearningStyleBadge({ style }: LearningStyleBadgeProps) {
  const config = STYLE_CONFIG[style] ?? STYLE_CONFIG.UNKNOWN
  return (
    <Badge variant={config.variant}>
      {config.icon} {config.label}
    </Badge>
  )
}
