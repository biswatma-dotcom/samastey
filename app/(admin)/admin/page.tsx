import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { redirect } from 'next/navigation'

async function getStats() {
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400_000)
  const d30 = new Date(now.getTime() - 30 * 86400_000)

  const [
    totalUsers, totalStudents, activeStudents7d, activeStudents30d,
    totalSubjects, seededSubjects, totalConcepts,
    totalContent, totalQuestions, totalSessions, masteryAchievements,
    languageCounts, boardCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.student.count({ where: { lastActiveAt: { gte: d7 } } }),
    prisma.student.count({ where: { lastActiveAt: { gte: d30 } } }),
    prisma.subject.count(),
    prisma.subject.count({ where: { concepts: { some: {} } } }),
    prisma.concept.count(),
    prisma.conceptContent.count(),
    prisma.question.count(),
    prisma.learningSession.count(),
    prisma.learningRecord.count({ where: { masteryAchieved: true } }),
    prisma.student.groupBy({ by: ['language'], _count: { language: true }, orderBy: { _count: { language: 'desc' } }, take: 5 }),
    prisma.student.groupBy({ by: ['board'], _count: { board: true } }),
  ])

  return {
    totalUsers, totalStudents, activeStudents7d, activeStudents30d,
    totalSubjects, seededSubjects, unseeded: totalSubjects - seededSubjects,
    totalConcepts, totalContent, totalQuestions, totalSessions, masteryAchievements,
    languageCounts, boardCounts,
  }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

export default async function AdminOverviewPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  const s = await getStats()

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white">Platform Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time stats across all users and content</p>
      </div>

      {/* Users */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Users</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Users" value={s.totalUsers} />
          <StatCard label="Students" value={s.totalStudents} />
          <StatCard label="Active (7d)" value={s.activeStudents7d} sub={`${Math.round(s.activeStudents7d / Math.max(s.totalStudents, 1) * 100)}% of students`} />
          <StatCard label="Active (30d)" value={s.activeStudents30d} />
        </div>
      </section>

      {/* Content */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Content</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Subjects" value={s.totalSubjects} sub={`${s.seededSubjects} seeded · ${s.unseeded} pending`} />
          <StatCard label="Concepts" value={s.totalConcepts} />
          <StatCard label="Cached Explanations" value={s.totalContent} />
          <StatCard label="Practice Questions" value={s.totalQuestions} />
        </div>
      </section>

      {/* Learning */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">Learning</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatCard label="Learning Sessions" value={s.totalSessions} />
          <StatCard label="Mastery Achievements" value={s.masteryAchievements} />
        </div>
      </section>

      {/* Breakdown */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Board breakdown */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Students by Board</h3>
          <div className="space-y-3">
            {s.boardCounts.map((b) => (
              <div key={String(b.board)} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{String(b.board)}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 rounded-full bg-orange-500/20 w-32 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${Math.round(b._count.board / Math.max(s.totalStudents, 1) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-400 w-6 text-right">{b._count.board}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Language breakdown */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Languages</h3>
          <div className="space-y-3">
            {s.languageCounts.map((l) => (
              <div key={l.language} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{l.language.toUpperCase()}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 rounded-full bg-orange-500/20 w-32 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      style={{ width: `${Math.round(l._count.language / Math.max(s.totalStudents, 1) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-400 w-6 text-right">{l._count.language}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
