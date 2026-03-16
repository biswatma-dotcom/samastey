import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getSubjectProgress, getStuckConcepts, getWeeklyActivity } from '@/lib/db/queries/progress'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { LearningStyleBadge } from '@/components/learn/LearningStyleBadge'
import { Navbar } from '@/components/shared/Navbar'

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const parent = await prisma.parent.findUnique({
    where: { userId: (session.user as any).id },
    include: {
      students: {
        include: { user: { select: { name: true } } },
      },
    },
  })

  if (!parent) redirect('/')

  const studentsData = await Promise.all(
    (parent as any).students.map(async (student: any) => {
      const [progress, stuck, activity] = await Promise.all([
        getSubjectProgress(student.id, student.grade, student.board),
        getStuckConcepts(student.id),
        getWeeklyActivity(student.id),
      ])

      const totalMastered = progress.reduce((s: number, p: any) => s + p.masteredConcepts, 0)
      const totalConcepts = progress.reduce((s: number, p: any) => s + p.totalConcepts, 0)

      return { student, progress, stuck, activity, totalMastered, totalConcepts }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parent Dashboard</h1>

        {studentsData.map(({ student, progress, stuck, activity, totalMastered, totalConcepts }: any) => {
          const overallPercent = totalConcepts > 0 ? Math.round((totalMastered / totalConcepts) * 100) : 0
          const activityEntries = Object.entries(activity).sort(([a], [b]) => a.localeCompare(b))

          return (
            <div key={student.id} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {/* Student header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{student.user.name}</h2>
                  <p className="text-sm text-gray-500">Class {student.grade} {student.board} · {student.streakDays} day streak · {student.xpTotal.toLocaleString()} XP</p>
                </div>
                <div className="flex items-center gap-3">
                  <LearningStyleBadge style={student.learningStyle} />
                  <ProgressRing percent={overallPercent} size={64} label="overall" />
                </div>
              </div>

              {/* Subject breakdown */}
              <div className="grid gap-3 sm:grid-cols-2">
                {progress.map((p: any) => (
                  <div key={p.subjectId} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.subjectName}</span>
                      <span className="text-sm font-bold text-orange-600">{p.masteryPercent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{ width: `${p.masteryPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{p.masteredConcepts}/{p.totalConcepts} mastered</p>
                  </div>
                ))}
              </div>

              {/* Weekly activity */}
              {activityEntries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Weekly Activity</h3>
                  <div className="flex gap-2">
                    {activityEntries.slice(-7).map(([day, data]: [string, any]) => (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <div
                          className="w-6 rounded bg-orange-400"
                          style={{ height: `${Math.max(4, data.attempted * 8)}px` }}
                          title={`${data.attempted} sessions`}
                        />
                        <span className="text-xs text-gray-400">
                          {new Date(day).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stuck concepts */}
              {stuck.length > 0 && (
                <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    ⚠️ Needs Attention ({stuck.length} concept{stuck.length > 1 ? 's' : ''})
                  </h3>
                  <ul className="space-y-1">
                    {stuck.map((r: any) => (
                      <li key={r.id} className="text-sm text-amber-700 dark:text-amber-300">
                        {r.concept.title} — {Math.round(r.masteryScore)}% mastery
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </main>
    </div>
  )
}
