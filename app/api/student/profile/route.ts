import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
    include: { user: { select: { name: true, email: true } } },
  })

  if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

  return NextResponse.json(student)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const allowedFields = ['learningStyle', 'learningPace', 'grade', 'board']
  const updates: any = {}

  for (const key of allowedFields) {
    if (data[key] !== undefined) updates[key] = data[key]
  }

  const student = await prisma.student.update({
    where: { userId: (session.user as any).id },
    data: updates,
  })

  return NextResponse.json(student)
}
