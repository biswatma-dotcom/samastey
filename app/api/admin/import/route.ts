import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') return false
  return true
}

interface McqQuestion {
  problem: string
  options: string[]
  answer: string
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface BoardQuestion {
  problem: string
  marks: 1 | 2 | 3 | 5
  answer: string
  marking_scheme: string[]
}

interface ImportData {
  source: string
  explanation: string
  mcq_questions: McqQuestion[]
  board_questions: BoardQuestion[]
  reference_material: string
}

interface ImportBody {
  conceptId: string
  replaceExisting?: boolean
  data: ImportData
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: ImportBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { conceptId, replaceExisting = false, data } = body

  // Validate required fields
  if (!conceptId) {
    return NextResponse.json({ error: 'conceptId is required' }, { status: 400 })
  }
  if (!data || !data.source || !data.explanation || !data.reference_material) {
    return NextResponse.json({ error: 'data.source, data.explanation, and data.reference_material are required' }, { status: 400 })
  }
  if (!Array.isArray(data.mcq_questions)) {
    return NextResponse.json({ error: 'data.mcq_questions must be an array' }, { status: 400 })
  }
  if (!Array.isArray(data.board_questions)) {
    return NextResponse.json({ error: 'data.board_questions must be an array' }, { status: 400 })
  }

  // 1. Validate conceptId exists
  const concept = await prisma.concept.findUnique({ where: { id: conceptId }, select: { id: true } })
  if (!concept) {
    return NextResponse.json({ error: `Concept "${conceptId}" not found` }, { status: 404 })
  }

  // 2. Delete existing content if replaceExisting
  if (replaceExisting) {
    // Delete ConceptContent for UNKNOWN and READING_WRITING styles
    await prisma.conceptContent.deleteMany({
      where: {
        conceptId,
        learningStyle: { in: ['UNKNOWN', 'READING_WRITING'] },
      },
    })

    // Collect unique difficulties in the imported MCQ set
    const importedDifficultiesSet = new Set(data.mcq_questions.map((q) => q.difficulty))
    const importedDifficulties = Array.from(importedDifficultiesSet)

    // Delete imported-difficulty questions (identified by [Imported] prefix) and board questions
    const boardTypesSet = new Set(data.board_questions.map((q) => `board_${q.marks}`))
    const boardTypes = Array.from(boardTypesSet)
    await prisma.question.deleteMany({
      where: {
        conceptId,
        OR: [
          {
            type: 'multiple_choice',
            difficulty: { in: importedDifficulties },
            explanation: { startsWith: '[Imported]' },
          },
          {
            type: { in: boardTypes },
            explanation: { startsWith: '[Imported]' },
          },
        ],
      },
    })

    // Delete all ConceptMaterials for this concept
    await prisma.conceptMaterial.deleteMany({ where: { conceptId } })
  }

  // 3 & 4. Upsert ConceptContent for UNKNOWN and READING_WRITING styles
  await prisma.conceptContent.upsert({
    where: { conceptId_learningStyle_language: { conceptId, learningStyle: 'UNKNOWN', language: 'en' } },
    create: { conceptId, learningStyle: 'UNKNOWN', language: 'en', content: data.explanation },
    update: { content: data.explanation },
  })

  await prisma.conceptContent.upsert({
    where: { conceptId_learningStyle_language: { conceptId, learningStyle: 'READING_WRITING', language: 'en' } },
    create: { conceptId, learningStyle: 'READING_WRITING', language: 'en', content: data.explanation },
    update: { content: data.explanation },
  })

  // 5. Create MCQ questions
  const mcqData = data.mcq_questions.map((q, idx) => ({
    conceptId,
    problem: q.problem,
    type: 'multiple_choice',
    options: q.options,
    answer: q.answer,
    explanation: `[Imported] ${q.explanation}`,
    difficulty: q.difficulty,
    orderIndex: idx,
  }))

  await prisma.question.createMany({ data: mcqData })

  // 6. Create board questions
  const boardData = data.board_questions.map((q, idx) => ({
    conceptId,
    problem: q.problem,
    type: `board_${q.marks}`,
    options: [] as string[],
    answer: q.answer,
    explanation: `[Imported] ${Array.isArray(q.marking_scheme) ? q.marking_scheme.join('\n') : ''}`,
    difficulty: q.marks <= 1 ? 'easy' : q.marks <= 2 ? 'medium' : 'hard',
    orderIndex: data.mcq_questions.length + idx,
  }))

  await prisma.question.createMany({ data: boardData })

  // 7. Upsert ConceptMaterial
  const existingMaterial = await prisma.conceptMaterial.findFirst({ where: { conceptId } })
  if (existingMaterial) {
    await prisma.conceptMaterial.update({
      where: { id: existingMaterial.id },
      data: { title: data.source, content: data.reference_material, source: data.source },
    })
  } else {
    await prisma.conceptMaterial.create({
      data: { conceptId, title: data.source, content: data.reference_material, source: data.source },
    })
  }

  // 8. Return summary
  return NextResponse.json({
    imported: {
      explanations: 2,
      mcq: mcqData.length,
      board: boardData.length,
      material: 1,
    },
  })
}
