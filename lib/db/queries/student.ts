import { prisma } from '../prisma'
import { LearningStyle } from '@/types'

export async function getStudentByUserId(userId: string) {
  return prisma.student.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, email: true } },
    },
  })
}

export async function updateLearningStyle(studentId: string, style: LearningStyle) {
  return prisma.student.update({
    where: { id: studentId },
    data: { learningStyle: style },
  })
}

export async function updateStudentXP(studentId: string, xpToAdd: number) {
  return prisma.student.update({
    where: { id: studentId },
    data: { xpTotal: { increment: xpToAdd }, lastActiveAt: new Date() },
  })
}

export async function updateStreak(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return null

  const now = new Date()
  const lastActive = student.lastActiveAt

  let newStreak = student.streakDays
  if (lastActive) {
    const diffMs = now.getTime() - lastActive.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      newStreak += 1
    } else if (diffDays > 1) {
      newStreak = 1
    }
    // same day: no change
  } else {
    newStreak = 1
  }

  return prisma.student.update({
    where: { id: studentId },
    data: { streakDays: newStreak, lastActiveAt: now },
  })
}

export async function createOrUpdateLearningRecord(
  studentId: string,
  conceptId: string,
  masteryScore: number
) {
  const existing = await prisma.learningRecord.findFirst({
    where: { studentId, conceptId },
  })

  const masteryAchieved = masteryScore >= 80

  if (existing) {
    return prisma.learningRecord.update({
      where: { id: existing.id },
      data: {
        masteryScore,
        masteryAchieved,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
        masteredAt: masteryAchieved && !existing.masteryAchieved ? new Date() : existing.masteredAt,
        updatedAt: new Date(),
      },
    })
  }

  return prisma.learningRecord.create({
    data: {
      studentId,
      conceptId,
      masteryScore,
      masteryAchieved,
      attempts: 1,
      lastAttemptAt: new Date(),
      masteredAt: masteryAchieved ? new Date() : null,
    },
  })
}
