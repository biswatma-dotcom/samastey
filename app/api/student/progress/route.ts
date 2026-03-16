import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getSubjectProgress } from '@/lib/db/queries/progress'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
  })

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const progress = await getSubjectProgress(student.id, student.grade, student.board)

  return NextResponse.json(progress)
}
