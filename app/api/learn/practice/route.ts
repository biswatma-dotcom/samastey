import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getConceptById } from '@/lib/db/queries/concepts'
import { generatePracticeQuestion, generateBoardQuestion, pickDifficulty } from '@/lib/ai/questionGenerator'
import { LearningStyle, Language } from '@/types'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    conceptId,
    correctStreak = 0,
    lastWasCorrect = null,
    lastProblems = [],
    mode = 'mcq',
  } = await req.json()

  if (!conceptId) return NextResponse.json({ error: 'conceptId required' }, { status: 400 })

  const [concept, student] = await Promise.all([
    getConceptById(conceptId),
    prisma.student.findUnique({ where: { userId: (session.user as any).id } }),
  ])

  if (!concept || !student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const language = (student.language || 'en') as Language

  // ── Board exam mode — always generate fresh (not cached) ─────────────────
  if (mode === 'board') {
    try {
      const generated = await generateBoardQuestion({
        conceptTitle: concept.title,
        subjectName: concept.subject.name,
        board: student.board,
        grade: student.grade,
        previousProblems: lastProblems.slice(-3),
        language,
      })
      // Save to pool for history reference (not served back from pool)
      const saved = await prisma.question.create({
        data: {
          conceptId,
          problem: generated.problem,
          type: generated.type,
          options: [],
          answer: generated.answer,
          explanation: generated.explanation,
          difficulty: 'medium',
          orderIndex: 0,
        },
      })
      return NextResponse.json({
        id: saved.id,
        problem: generated.problem,
        type: generated.type,
        options: [],
        answer: generated.answer,
        explanation: generated.explanation,
        marks: generated.marks,
        markingScheme: generated.markingScheme,
      })
    } catch (err: any) {
      console.error('[practice] board question failed:', err?.message ?? err)
      return NextResponse.json({ error: err?.message ?? 'Failed to generate question' }, { status: 500 })
    }
  }

  // ── MCQ mode — use question pool ─────────────────────────────────────────
  const difficulty = pickDifficulty(correctStreak, lastWasCorrect)

  const pool = await prisma.question.findMany({
    where: { conceptId, difficulty, type: 'multiple_choice' },
    select: { id: true, problem: true, type: true, options: true, answer: true, explanation: true },
  })

  const unused = pool.filter((q) => !lastProblems.includes(q.problem))
  const candidate = unused.length > 0
    ? unused[Math.floor(Math.random() * unused.length)]
    : pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : null

  // Refill pool in background if running low
  if (pool.length < 5) {
    generatePracticeQuestion({
      conceptTitle: concept.title,
      subjectName: concept.subject.name,
      board: student.board,
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
    ).catch(() => { /* silent */ })
  }

  if (candidate) {
    return NextResponse.json({ ...candidate, difficulty })
  }

  // Pool empty — generate on-demand
  try {
    const generated = await generatePracticeQuestion({
      conceptTitle: concept.title,
      subjectName: concept.subject.name,
      board: student.board,
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
