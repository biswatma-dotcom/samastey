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
  const board = searchParams.get('board')
  const grade = searchParams.get('grade')

  const where: any = {}
  if (board) where.board = board
  if (grade) where.grade = parseInt(grade)

  const subjects = await prisma.subject.findMany({
    where,
    include: {
      _count: { select: { concepts: true } },
    },
    orderBy: [{ board: 'asc' }, { grade: 'asc' }, { name: 'asc' }],
  })

  // Get content + question counts per subject via concept IDs
  const subjectIds = subjects.map((s) => s.id)
  const concepts = await prisma.concept.findMany({
    where: { subjectId: { in: subjectIds } },
    select: { id: true, subjectId: true },
  })

  const conceptsBySubject: Record<string, string[]> = {}
  for (const c of concepts) {
    if (!conceptsBySubject[c.subjectId]) conceptsBySubject[c.subjectId] = []
    conceptsBySubject[c.subjectId].push(c.id)
  }

  const allConceptIds = concepts.map((c) => c.id)
  const [contentCounts, questionCounts] = await Promise.all([
    prisma.conceptContent.groupBy({
      by: ['conceptId'],
      where: { conceptId: { in: allConceptIds } },
      _count: { conceptId: true },
    }),
    prisma.question.groupBy({
      by: ['conceptId'],
      where: { conceptId: { in: allConceptIds } },
      _count: { conceptId: true },
    }),
  ])

  const contentByConceptId = Object.fromEntries(contentCounts.map((r) => [r.conceptId, r._count.conceptId]))
  const questionsByConceptId = Object.fromEntries(questionCounts.map((r) => [r.conceptId, r._count.conceptId]))

  const data = subjects.map((s) => {
    const cids = conceptsBySubject[s.id] ?? []
    const totalContent = cids.reduce((sum, id) => sum + (contentByConceptId[id] ?? 0), 0)
    const totalQuestions = cids.reduce((sum, id) => sum + (questionsByConceptId[id] ?? 0), 0)
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      grade: s.grade,
      board: s.board,
      conceptCount: s._count.concepts,
      contentCount: totalContent,
      questionCount: totalQuestions,
    }
  })

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const conceptId = searchParams.get('conceptId')

  if (conceptId) {
    const deleted = await prisma.conceptContent.deleteMany({ where: { conceptId } })
    return NextResponse.json({ deleted: deleted.count })
  }

  if (subjectId) {
    const concepts = await prisma.concept.findMany({ where: { subjectId }, select: { id: true } })
    const ids = concepts.map((c) => c.id)
    const deleted = await prisma.conceptContent.deleteMany({ where: { conceptId: { in: ids } } })
    return NextResponse.json({ deleted: deleted.count })
  }

  return NextResponse.json({ error: 'subjectId or conceptId required' }, { status: 400 })
}
