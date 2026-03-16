import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getConceptById } from '@/lib/db/queries/concepts'
import { generatePracticeQuestion, pickDifficulty } from '@/lib/ai/questionGenerator'
import { LearningStyle, Language } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    conceptId,
    correctStreak = 0,
    lastWasCorrect = null,
    lastProblems = [],
  } = await req.json()

  if (!conceptId) return NextResponse.json({ error: 'conceptId required' }, { status: 400 })

  const [concept, student] = await Promise.all([
    getConceptById(conceptId),
    prisma.student.findUnique({ where: { userId: (session.user as any).id } }),
  ])

  if (!concept || !student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const difficulty = pickDifficulty(correctStreak, lastWasCorrect)

  // Try to serve from the existing question pool first (avoid live API call)
  const pool = await prisma.question.findMany({
    where: { conceptId, difficulty },
    select: { id: true, problem: true, type: true, options: true, answer: true, explanation: true },
  })

  const unused = pool.filter((q) => !lastProblems.includes(q.problem))
  const candidate = unused.length > 0
    ? unused[Math.floor(Math.random() * unused.length)]
    : pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : null

  const language = (student.language || 'en') as Language

  // Refill pool in background if running low (fire-and-forget)
  if (pool.length < 5) {
    generatePracticeQuestion({
      conceptTitle: concept.title,
      learningStyle: student.learningStyle as LearningStyle,
      grade: student.grade,
      difficulty,
      previousProblems: pool.map((q) => q.problem),
      language,
    }).then((generated) =>
      prisma.question.create({
        data: {
          conceptId,
          problem: generated.problem,
          type: generated.type,
          options: generated.options ?? [],
          answer: generated.answer,
          explanation: generated.explanation,
          difficulty,
          orderIndex: 0,
        },
      })
    ).catch(() => { /* silent — pool refill is best-effort */ })
  }

  // Serve from pool instantly if available
  if (candidate) {
    return NextResponse.json({ ...candidate, difficulty })
  }

  // Pool was empty — generate on-demand (first time only)
  try {
    const generated = await generatePracticeQuestion({
      conceptTitle: concept.title,
      learningStyle: student.learningStyle as LearningStyle,
      grade: student.grade,
      difficulty,
      previousProblems: lastProblems.slice(-3),
      language,
    })

    const saved = await prisma.question.create({
      data: {
        conceptId,
        problem: generated.problem,
        type: generated.type,
        options: generated.options ?? [],
        answer: generated.answer,
        explanation: generated.explanation,
        difficulty,
        orderIndex: 0,
      },
    })

    return NextResponse.json({
      id: saved.id,
      problem: saved.problem,
      type: saved.type,
      options: saved.options,
      answer: saved.answer,
      explanation: saved.explanation,
      difficulty,
    })
  } catch (err: any) {
    console.error('[practice] question generation failed:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Failed to generate question' }, { status: 500 })
  }
}
