import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getWeeklyActivity } from '@/lib/db/queries/progress'
import { StreakWidget } from '@/components/dashboard/StreakWidget'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
    include: { user: { select: { name: true } } },
  })

  if (!student) redirect('/login')
  if (student.learningStyle === 'UNKNOWN') redirect('/onboarding')

  const [weeklyActivity, recentRecords] = await Promise.all([
    getWeeklyActivity(student.id),
    prisma.learningRecord.findMany({
      where: { studentId: student.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { concept: { include: { subject: { select: { name: true } } } } },
    }),
  ])

  const nextConcept = await prisma.concept.findFirst({
    where: {
      subject: { grade: student.grade, board: student.board },
      records: { none: { studentId: student.id, masteryAchieved: true } },
    },
    orderBy: { orderIndex: 'asc' },
    include: { subject: { select: { name: true } } },
  })

  const totalMastered = await prisma.learningRecord.count({
    where: { studentId: student.id, masteryAchieved: true },
  })

  // Build 7-day activity grid
  const days: { label: string; key: string; active: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    days.push({
      label: d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1),
      key,
      active: !!weeklyActivity[key],
    })
  }

  const firstName = student.user.name.split(' ')[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hey, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Class {student.grade} · {student.board} · 2026–27
          </p>
        </div>
        <StreakWidget streakDays={student.streakDays} xpTotal={student.xpTotal} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total XP', value: student.xpTotal.toLocaleString(), icon: '⚡', color: 'text-amber-500' },
          { label: 'Day Streak', value: `${student.streakDays}d`, icon: '🔥', color: 'text-orange-500' },
          { label: 'Concepts Mastered', value: totalMastered, icon: '✅', color: 'text-green-600' },
          { label: 'Class', value: `${student.grade} ${student.board}`, icon: '🎓', color: 'text-orange-600' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-lg">{s.icon}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Continue learning */}
      {nextConcept ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900 dark:bg-orange-950">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Up Next</p>
          <h3 className="mt-1 text-lg font-semibold text-orange-900 dark:text-orange-100">
            {nextConcept.title}
          </h3>
          <p className="mt-0.5 text-sm text-orange-600 dark:text-orange-400">
            {nextConcept.subject.name} · ~{nextConcept.estimatedMinutes} min
          </p>
          <Link
            href={`/learn/${nextConcept.id}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
          >
            Start Learning →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-1 font-semibold text-green-800 dark:text-green-200">
            All concepts mastered for Class {student.grade}!
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            This Week
          </h2>
          <div className="flex items-end gap-2">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md transition-all ${
                    d.active
                      ? 'bg-orange-500 h-8'
                      : 'bg-gray-100 dark:bg-gray-800 h-4'
                  }`}
                />
                <span className="text-xs text-gray-400">{d.label}</span>
              </div>
            ))}
          </div>
          {!days.some((d) => d.active) && (
            <p className="mt-3 text-xs text-gray-400 text-center">No activity yet this week. Start learning!</p>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Recently Studied
          </h2>
          {recentRecords.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing yet — start a concept to see activity here.</p>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((r: any) => (
                <Link
                  key={r.id}
                  href={`/learn/${r.conceptId}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-base">
                    {r.masteryAchieved ? '✅' : '📖'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {r.concept.title}
                    </p>
                    <p className="text-xs text-gray-400">{r.concept.subject.name}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {Math.round(r.masteryScore)}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { href: '/subjects', icon: '📚', label: 'Subjects', desc: 'Browse all topics' },
          { href: '/progress', icon: '📊', label: 'Progress', desc: 'Your mastery report' },
          { href: '/settings', icon: '⚙️', label: 'Settings', desc: 'Adjust preferences' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-4 hover:border-orange-300 hover:shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="text-xl">{item.icon}</span>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
