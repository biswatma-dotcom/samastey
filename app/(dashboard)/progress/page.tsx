import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getSubjectProgress } from '@/lib/db/queries/progress'
import { ProgressRing } from '@/components/dashboard/ProgressRing'
import { ProgressFilterBar } from '@/components/progress/ProgressFilterBar'

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: { grade?: string; board?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
    include: { user: { select: { name: true } } },
  })
  if (!student) redirect('/login')

  // Find all grade/board combos this student has ever studied
  const studiedSubjects = await prisma.subject.findMany({
    where: {
      concepts: {
        some: { records: { some: { studentId: student.id } } },
      },
    },
    select: { grade: true, board: true },
    distinct: ['grade', 'board'],
    orderBy: [{ grade: 'asc' }, { board: 'asc' }],
  })

  // Always include current grade/board
  const combos: { grade: number; board: string }[] = [...studiedSubjects]
  if (!combos.find((c) => c.grade === student.grade && c.board === student.board)) {
    combos.push({ grade: student.grade, board: student.board })
  }
  combos.sort((a, b) => a.grade - b.grade || a.board.localeCompare(b.board))

  // Determine active filter (default: current grade/board)
  const filterGrade = searchParams.grade ? parseInt(searchParams.grade) : student.grade
  const filterBoard = searchParams.board ?? student.board

  const filterOptions = combos.map((c) => ({
    grade: c.grade,
    board: c.board,
    label: `Class ${c.grade} · ${c.board}`,
    isCurrent: c.grade === student.grade && c.board === student.board,
  }))

  const progress = await getSubjectProgress(student.id, filterGrade, filterBoard)
  const totalMastered = progress.reduce((s: number, p: any) => s + p.masteredConcepts, 0)
  const totalConcepts = progress.reduce((s: number, p: any) => s + p.totalConcepts, 0)

  const weakRecords = await prisma.learningRecord.findMany({
    where: {
      studentId: student.id,
      masteryAchieved: false,
      masteryScore: { gt: 0, lt: 40 },
      concept: { subject: { grade: filterGrade, board: filterBoard as any } },
    },
    include: { concept: { include: { subject: { select: { name: true } } } } },
    take: 5,
    orderBy: { updatedAt: 'asc' },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your mastery across classes and subjects
        </p>
      </div>

      {/* Class/board filter */}
      {combos.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Viewing progress for
          </p>
          <Suspense>
            <ProgressFilterBar
              options={filterOptions}
              activeGrade={filterGrade}
              activeBoard={filterBoard}
            />
          </Suspense>
        </div>
      )}

      {/* Viewing label when only one combo */}
      {combos.length === 1 && (
        <p className="text-sm text-gray-500">
          Class {filterGrade} · {filterBoard}
        </p>
      )}

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total XP', value: student.xpTotal.toLocaleString(), icon: '⚡' },
          { label: 'Day Streak', value: student.streakDays, icon: '🔥' },
          { label: 'Concepts Mastered', value: totalMastered, icon: '✅' },
          {
            label: 'Overall Mastery',
            value: `${Math.round((totalMastered / (totalConcepts || 1)) * 100)}%`,
            icon: '📈',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-2xl">{stat.icon}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subject breakdown */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Subject Mastery — Class {filterGrade} {filterBoard}
        </h2>
        {progress.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-400 text-sm">No subjects found for this class and board.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {progress.map((p: any) => (
              <div
                key={p.subjectId}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-4">
                  <ProgressRing percent={p.masteryPercent} size={56} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {p.subjectName}
                      </h3>
                      <span className="text-sm font-bold text-orange-600">{p.masteryPercent}%</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-orange-600 transition-all"
                        style={{ width: `${p.masteryPercent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {p.masteredConcepts}/{p.totalConcepts} concepts mastered
                      {p.inProgressConcepts > 0 && ` · ${p.inProgressConcepts} in progress`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Needs attention */}
      {weakRecords.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Needs Attention
          </h2>
          <div className="space-y-2">
            {weakRecords.map((r: any) => (
              <a
                key={r.id}
                href={`/learn/${r.conceptId}`}
                className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm hover:shadow-sm dark:border-amber-900 dark:bg-amber-950"
              >
                <span>⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-amber-900 dark:text-amber-100 truncate">
                    {r.concept.title}
                  </p>
                  <p className="text-xs text-amber-600">
                    {r.concept.subject.name} · {Math.round(r.masteryScore)}% mastery
                  </p>
                </div>
                <span className="text-amber-600 font-medium text-xs shrink-0">Review →</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
