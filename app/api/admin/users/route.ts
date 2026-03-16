import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = 25
  const search = searchParams.get('search') ?? ''
  const grade = searchParams.get('grade')
  const board = searchParams.get('board')

  const where: any = {}
  if (search) {
    where.user = { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
  }
  if (grade) where.grade = parseInt(grade)
  if (board) where.board = board

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        _count: { select: { records: true, sessions: true } },
      },
      orderBy: { lastActiveAt: { sort: 'desc', nulls: 'last' } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
  ])

  // Get mastery counts per student
  const studentIds = students.map((s) => s.id)
  const masteryRows = await prisma.learningRecord.groupBy({
    by: ['studentId'],
    where: { studentId: { in: studentIds }, masteryAchieved: true },
    _count: { studentId: true },
  })
  const masteryMap = Object.fromEntries(masteryRows.map((r) => [r.studentId, r._count.studentId]))

  const data = students.map((s) => ({
    id: s.id,
    userId: s.userId,
    name: s.user.name,
    email: s.user.email,
    joinedAt: s.user.createdAt,
    grade: s.grade,
    board: s.board,
    learningStyle: s.learningStyle,
    learningPace: s.learningPace,
    language: s.language,
    xpTotal: s.xpTotal,
    streakDays: s.streakDays,
    lastActiveAt: s.lastActiveAt,
    totalRecords: s._count.records,
    totalSessions: s._count.sessions,
    masteryCount: masteryMap[s.id] ?? 0,
  }))

  return NextResponse.json({ data, total, page, pages: Math.ceil(total / limit) })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, role } = await req.json()
  if (!userId || !role) return NextResponse.json({ error: 'userId and role required' }, { status: 400 })

  const user = await prisma.user.update({ where: { id: userId }, data: { role } })
  return NextResponse.json({ id: user.id, role: user.role })
}
