import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

function adminCheck(session: any) {
  return (session?.user as any)?.role !== 'ADMIN'
}

// GET ?subjectId=x — returns all concepts for that subject with their materials
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (adminCheck(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const concepts = await prisma.concept.findMany({
    where: { subjectId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      title: true,
      orderIndex: true,
      materials: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true, content: true, source: true },
      },
    },
  })

  return NextResponse.json(concepts)
}

// POST — create a ConceptMaterial
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (adminCheck(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { conceptId, title, content, source } = await req.json()
  if (!conceptId || !content) {
    return NextResponse.json({ error: 'conceptId and content required' }, { status: 400 })
  }

  const material = await prisma.conceptMaterial.create({
    data: {
      conceptId,
      title: title || 'Reference Material',
      content,
      source: source || null,
    },
  })

  return NextResponse.json(material)
}

// PATCH — update a ConceptMaterial
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (adminCheck(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, title, content, source } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const updates: any = {}
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (source !== undefined) updates.source = source || null

  const material = await prisma.conceptMaterial.update({ where: { id }, data: updates })
  return NextResponse.json(material)
}

// DELETE — delete a ConceptMaterial
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (adminCheck(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.conceptMaterial.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
