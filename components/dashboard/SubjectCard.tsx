import Link from 'next/link'
import { ProgressRing } from './ProgressRing'
import { Card, CardContent } from '@/components/ui/card'
import { SubjectProgress } from '@/types'

interface SubjectCardProps {
  progress: SubjectProgress
}

export function SubjectCard({ progress }: SubjectCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <ProgressRing percent={progress.masteryPercent} size={72} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {progress.subjectName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {progress.masteredConcepts}/{progress.totalConcepts} concepts mastered
          </p>
          {progress.inProgressConcepts > 0 && (
            <p className="text-xs text-orange-500 mt-0.5">
              {progress.inProgressConcepts} in progress
            </p>
          )}
        </div>
        <Link
          href={`/subjects`}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
        >
          Continue →
        </Link>
      </CardContent>
    </Card>
  )
}
