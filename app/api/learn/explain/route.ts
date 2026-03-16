import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { streamExplanation, streamAlternateExplanation, streamAnswer } from '@/lib/ai/explainer'
import { getConceptById } from '@/lib/db/queries/concepts'
import { LearningStyle, Pace, Language } from '@/types'

export async function POST(req: NextRequest) {
  try {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conceptId, previousApproach, studentQuestion } = await req.json()
  if (!conceptId) return NextResponse.json({ error: 'conceptId required' }, { status: 400 })

  const [concept, student] = await Promise.all([
    getConceptById(conceptId),
    prisma.student.findUnique({ where: { userId: (session.user as any).id } }),
  ])

  if (!concept || !student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Log interaction
  const activeSession = await prisma.learningSession.findFirst({
    where: { studentId: student.id, conceptId, endedAt: null },
  })
  if (activeSession) {
    await prisma.interaction.create({
      data: { sessionId: activeSession.id, type: 'EXPLANATION_REQUEST' },
    })
  }

  const language = (student.language || 'en') as Language

  // Student asked a specific question
  if (studentQuestion) {
    const stream = streamAnswer({
      conceptTitle: concept.title,
      studentQuestion,
      learningStyle: student.learningStyle as LearningStyle,
      grade: student.grade,
      board: student.board,
      language,
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })
  }

  // "Explain differently" — always generate fresh, no cache
  if (previousApproach) {
    const stream = streamAlternateExplanation({
      conceptTitle: concept.title,
      learningStyle: student.learningStyle as LearningStyle,
      previousApproach,
      language,
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    })
  }

  // Initial explanation — check cache first
  const cached = await prisma.conceptContent.findFirst({
    where: { conceptId, learningStyle: student.learningStyle, language },
  })

  if (cached) {
    const raw = cached.content
    const closeIdx = raw.lastIndexOf('</think>')
    const hasThinkTag = raw.includes('<think>')

    // Invalid: think tag opened but never closed (model ran out of tokens during thinking)
    const isInvalidThink = hasThinkTag && closeIdx === -1
    if (!isInvalidThink) {
      // Extract actual content: prefer text after </think>, else use raw (no think tags present)
      let content: string
      if (closeIdx !== -1) {
        const afterThink = raw.slice(closeIdx + '</think>'.length).trim()
        content = afterThink.length > 30 ? afterThink : raw.replace(/<\/?think>/gi, '').trim()
      } else {
        content = raw.trim()
      }

      if (content.length >= 500) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(content))
            controller.close()
          },
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    }

    // Cache entry is bad (invalid think or too short) — delete and regenerate
    await prisma.conceptContent.delete({ where: { id: cached.id } })
  }

  // Cache miss — generate and save while streaming
  const baseStream = streamExplanation({
    conceptTitle: concept.title,
    conceptDescription: concept.description,
    learningStyle: student.learningStyle as LearningStyle,
    pace: student.learningPace as Pace,
    priorMistakes: [],
    grade: student.grade,
    board: student.board,
    objectives: concept.objectives.map((o: { description: string }) => o.description),
    language,
  })

  const decoder = new TextDecoder()
  let accumulated = ''
  const learningStyle = student.learningStyle

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      accumulated += decoder.decode(chunk, { stream: true })
      controller.enqueue(chunk)
    },
    async flush() {
      // Only cache if the response is substantive and the think block was properly closed
      const hasUnclosedThink = accumulated.includes('<think>') && !accumulated.includes('</think>')
      if (accumulated.length < 500 || hasUnclosedThink) return
      try {
        await prisma.conceptContent.create({
          data: { conceptId, learningStyle, language, content: accumulated },
        })
      } catch {
        // Ignore — likely a race condition duplicate
      }
    },
  })

  return new Response(baseStream.pipeThrough(transform), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
  } catch (err: any) {
    console.error('[explain] route error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
