import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conceptId } = await req.json()
  if (!conceptId) return NextResponse.json({ error: 'conceptId required' }, { status: 400 })

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
  })
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()

  await Promise.all([
    // Mark concept as mastered
    prisma.learningRecord.upsert({
      where: { studentId_conceptId: { studentId: student.id, conceptId } },
      create: {
        studentId: student.id,
        conceptId,
        masteryScore: 100,
        masteryAchieved: true,
        masteredAt: now,
        attempts: 1,
        lastAttemptAt: now,
      },
      update: {
        masteryScore: 100,
        masteryAchieved: true,
        masteredAt: now,
        lastAttemptAt: now,
      },
    }),
    // End any open session
    prisma.learningSession.updateMany({
      where: { studentId: student.id, conceptId, endedAt: null },
      data: { endedAt: now },
    }),
    // Award XP for completion
    prisma.student.update({
      where: { id: student.id },
      data: { xpTotal: { increment: 50 } },
    }),
  ])

  return NextResponse.json({ ok: true })
}
