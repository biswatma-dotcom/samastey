import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400_000)
  const d30 = new Date(now.getTime() - 30 * 86400_000)

  const [
    totalUsers,
    totalStudents,
    activeStudents7d,
    activeStudents30d,
    totalSubjects,
    seededSubjects,
    totalConcepts,
    totalContent,
    totalQuestions,
    totalSessions,
    masteryAchievements,
    languageCounts,
    boardCounts,
    gradeCounts,
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
    prisma.student.groupBy({ by: ['language'], _count: { language: true }, orderBy: { _count: { language: 'desc' } } }),
    prisma.student.groupBy({ by: ['board'], _count: { board: true } }),
    prisma.student.groupBy({ by: ['grade'], _count: { grade: true }, orderBy: { grade: 'asc' } }),
  ])

  return NextResponse.json({
    totalUsers,
    totalStudents,
    activeStudents7d,
    activeStudents30d,
    totalSubjects,
    seededSubjects,
    unseededSubjects: totalSubjects - seededSubjects,
    totalConcepts,
    totalContent,
    totalQuestions,
    totalSessions,
    masteryAchievements,
    languageCounts: languageCounts.map((r) => ({ language: r.language, count: r._count.language })),
    boardCounts: boardCounts.map((r) => ({ board: r.board, count: r._count.board })),
    gradeCounts: gradeCounts.map((r) => ({ grade: r.grade, count: r._count.grade })),
  })
}
