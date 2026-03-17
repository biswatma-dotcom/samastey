import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

interface ImportData {
  source: string
  explanation: string
  reference_material: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { conceptId: string; replaceExisting?: boolean; data: ImportData }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { conceptId, replaceExisting = false, data } = body

  if (!conceptId) {
    return NextResponse.json({ error: 'conceptId is required' }, { status: 400 })
  }
  if (!data?.source || !data?.explanation || !data?.reference_material) {
    return NextResponse.json({ error: 'data.source, data.explanation, and data.reference_material are required' }, { status: 400 })
  }

  const concept = await prisma.concept.findUnique({ where: { id: conceptId }, select: { id: true } })
  if (!concept) {
    return NextResponse.json({ error: `Concept not found` }, { status: 404 })
  }

  if (replaceExisting) {
    await prisma.conceptContent.deleteMany({
      where: { conceptId, learningStyle: { in: ['UNKNOWN', 'READING_WRITING'] } },
    })
    await prisma.conceptMaterial.deleteMany({ where: { conceptId } })
  }

  // Upsert explanation for UNKNOWN and READING_WRITING styles
  await Promise.all([
    prisma.conceptContent.upsert({
      where: { conceptId_learningStyle_language: { conceptId, learningStyle: 'UNKNOWN', language: 'en' } },
      create: { conceptId, learningStyle: 'UNKNOWN', language: 'en', content: data.explanation },
      update: { content: data.explanation },
    }),
    prisma.conceptContent.upsert({
      where: { conceptId_learningStyle_language: { conceptId, learningStyle: 'READING_WRITING', language: 'en' } },
      create: { conceptId, learningStyle: 'READING_WRITING', language: 'en', content: data.explanation },
      update: { content: data.explanation },
    }),
  ])

  // Upsert reference material
  const existing = await prisma.conceptMaterial.findFirst({ where: { conceptId } })
  if (existing) {
    await prisma.conceptMaterial.update({
      where: { id: existing.id },
      data: { title: data.source, content: data.reference_material, source: data.source },
    })
  } else {
    await prisma.conceptMaterial.create({
      data: { conceptId, title: data.source, content: data.reference_material, source: data.source },
    })
  }

  return NextResponse.json({ imported: { explanations: 2, material: 1 } })
}
