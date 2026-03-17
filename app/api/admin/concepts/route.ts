import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return false
  return true
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) {
    return NextResponse.json({ error: 'subjectId is required' }, { status: 400 })
  }

  const concepts = await prisma.concept.findMany({
    where: { subjectId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      orderIndex: true,
      isActive: true,
      estimatedMinutes: true,
      _count: {
        select: {
          materials: true,
          questions: true,
          contents: true,
        },
      },
    },
  })

  return NextResponse.json(concepts)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { subjectId, title, description, estimatedMinutes, grade } = await req.json()
  if (!subjectId || !title || !description) {
    return NextResponse.json({ error: 'subjectId, title, and description are required' }, { status: 400 })
  }

  const lastConcept = await prisma.concept.findFirst({
    where: { subjectId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })

  const orderIndex = lastConcept ? lastConcept.orderIndex + 1 : 0

  // Determine grade from subject if not provided
  let resolvedGrade = grade
  if (!resolvedGrade) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { grade: true } })
    resolvedGrade = subject?.grade ?? 1
  }

  const concept = await prisma.concept.create({
    data: {
      subjectId,
      title,
      description,
      estimatedMinutes: estimatedMinutes ?? 30,
      grade: resolvedGrade,
      orderIndex,
      isActive: true,
    },
  })

  return NextResponse.json(concept, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, title, description, isActive, estimatedMinutes } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (isActive !== undefined) data.isActive = isActive
  if (estimatedMinutes !== undefined) data.estimatedMinutes = estimatedMinutes

  const concept = await prisma.concept.update({ where: { id }, data })
  return NextResponse.json(concept)
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  await prisma.concept.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
