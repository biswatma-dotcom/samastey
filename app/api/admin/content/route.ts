import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

// DELETE all concept content (cache) — by subjectId, conceptId, or all
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  const conceptId = searchParams.get('conceptId')
  const all = searchParams.get('all') === 'true'

  if (all) {
    const deleted = await prisma.conceptContent.deleteMany({})
    return NextResponse.json({ deleted: deleted.count })
  }

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

  return NextResponse.json({ error: 'subjectId, conceptId, or all=true required' }, { status: 400 })
}

// GET — content stats
export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [total, byStyle, byLanguage, stale] = await Promise.all([
    prisma.conceptContent.count(),
    prisma.conceptContent.groupBy({ by: ['learningStyle'], _count: { learningStyle: true } }),
    prisma.conceptContent.groupBy({ by: ['language'], _count: { language: true }, orderBy: { _count: { language: 'desc' } } }),
    // Stale = contains unclosed think tags or too short
    prisma.conceptContent.count({ where: { content: { contains: '<think>' } } }),
  ])

  return NextResponse.json({
    total,
    stale,
    byStyle: byStyle.map((r) => ({ style: r.learningStyle, count: r._count.learningStyle })),
    byLanguage: byLanguage.map((r) => ({ language: r.language, count: r._count.language })),
  })
}
