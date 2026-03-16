import { prisma } from '../prisma'

export async function getStudentProgress(studentId: string) {
  return prisma.learningRecord.findMany({
    where: { studentId },
    include: {
      concept: {
        include: { subject: true },
      },
    },
  })
}

export async function getSubjectProgress(studentId: string, grade: number, board: string) {
  const subjects = await prisma.subject.findMany({
    where: { grade, board: board as any },
    include: {
      concepts: {
        include: {
          records: { where: { studentId } },
        },
      },
    },
  })

  return subjects.map((subject: any) => {
    const total = subject.concepts.length
    const mastered = subject.concepts.filter((c: any) => c.records[0]?.masteryAchieved).length
    const inProgress = subject.concepts.filter(
      (c: any) => c.records[0] && !c.records[0].masteryAchieved && c.records[0].masteryScore > 0
    ).length

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      totalConcepts: total,
      masteredConcepts: mastered,
      inProgressConcepts: inProgress,
      masteryPercent: total > 0 ? Math.round((mastered / total) * 100) : 0,
    }
  })
}

export async function getStuckConcepts(studentId: string, daysThreshold = 5) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold)

  return prisma.learningRecord.findMany({
    where: {
      studentId,
      masteryAchieved: false,
      masteryScore: { lt: 40 },
      lastAttemptAt: { lt: cutoffDate },
    },
    include: { concept: true },
  })
}

export async function getWeeklyActivity(studentId: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const sessions = await prisma.learningSession.findMany({
    where: {
      studentId,
      startedAt: { gte: sevenDaysAgo },
    },
    orderBy: { startedAt: 'asc' },
  })

  // Group by day
  const byDay: Record<string, { attempted: number; mastered: number }> = {}

  for (const session of sessions) {
    const day = session.startedAt.toISOString().split('T')[0]
    if (!byDay[day]) byDay[day] = { attempted: 0, mastered: 0 }
    byDay[day].attempted += 1

    if (session.assessmentScore && session.assessmentScore >= 80) {
      byDay[day].mastered += 1
    }
  }

  return byDay
}
