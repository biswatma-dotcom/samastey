import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getConceptById } from '@/lib/db/queries/concepts'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const concept = await getConceptById(params.id)
  if (!concept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
  })

  let record = null
  if (student) {
    record = await prisma.learningRecord.findFirst({
      where: { studentId: student.id, conceptId: params.id },
    })
  }

  return NextResponse.json({ ...concept, record })
}
