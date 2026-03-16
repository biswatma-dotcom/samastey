import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { sarvamChat } from '@/lib/ai/client'

interface ConceptJSON {
  title: string
  description: string
  estimatedMinutes: number
  objectives: string[]
  prerequisites: string[]
}

function buildPrompt(subjectName: string, board: string, grade: number): string {
  const boardFull = board === 'CBSE' ? 'CBSE (NCERT)' : 'ICSE/ISC (CISCE)'
  return `You are an expert in the Indian ${boardFull} curriculum for Class ${grade}.

Generate the complete list of chapters/topics for: "${subjectName}" (Class ${grade}, ${boardFull}, 2026-27).

Return ONLY a valid JSON array. No markdown, no explanation. Each element:
{"title":"Chapter Name","description":"2-3 sentences.","estimatedMinutes":60,"objectives":["obj1","obj2","obj3"],"prerequisites":[]}

Rules:
- Follow the official ${boardFull} syllabus strictly
- Include ALL chapters for the full academic year
- estimatedMinutes: 30–180 per chapter
- 3–5 objectives per chapter
- prerequisites: titles of earlier chapters in this subject only (or [])
- Use straight double quotes only. No trailing commas. Valid JSON.`
}

function extractJSONArray(text: string): ConceptJSON[] {
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found')
  let raw = clean.slice(start, end + 1)
  raw = raw.replace(/,(\s*[}\]])/g, '$1').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
  try {
    return JSON.parse(raw)
  } catch {
    const objects: ConceptJSON[] = []
    const re = /\{[\s\S]*?\}/g
    let m
    while ((m = re.exec(raw)) !== null) {
      try {
        const obj = JSON.parse(m[0].replace(/,(\s*[}\]])/g, '$1'))
        if (obj.title && obj.description) objects.push(obj)
      } catch { /* skip */ }
    }
    if (objects.length > 0) return objects
    throw new Error('Could not parse JSON')
  }
}

async function insertConcepts(subjectId: string, grade: number, concepts: ConceptJSON[]): Promise<void> {
  const titleToId: Record<string, string> = {}
  for (let idx = 0; idx < concepts.length; idx++) {
    const c = concepts[idx]
    const concept = await prisma.concept.create({
      data: {
        title: String(c.title ?? '').slice(0, 255),
        description: String(c.description ?? '').slice(0, 1000),
        subjectId,
        grade,
        orderIndex: idx + 1,
        estimatedMinutes: Number(c.estimatedMinutes) || 45,
        objectives: {
          create: (c.objectives ?? []).slice(0, 6).map((desc: string, oi: number) => ({
            description: String(desc).slice(0, 500),
            orderIndex: oi + 1,
          })),
        },
      },
    })
    titleToId[c.title] = concept.id
  }
  // Wire prerequisites
  for (const c of concepts) {
    if (!c.prerequisites?.length) continue
    const conceptId = titleToId[c.title]
    if (!conceptId) continue
    const prereqIds = c.prerequisites.map((pt: string) => titleToId[pt]).filter(Boolean) as string[]
    if (prereqIds.length > 0) {
      await prisma.concept.update({
        where: { id: conceptId },
        data: { prerequisites: { connect: prereqIds.map((id) => ({ id })) } },
      })
    }
  }
}

// POST /api/admin/seed  — seed a single subject (SSE stream)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { subjectId } = await req.json()
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { _count: { select: { concepts: true } } },
  })
  if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })

  const encoder = new TextEncoder()

  function event(type: string, payload: object) {
    return encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(event('start', { subject: subject.name, grade: subject.grade, board: subject.board }))

        if (subject._count.concepts > 0) {
          controller.enqueue(event('skip', { message: `Already has ${subject._count.concepts} concepts. Delete existing concepts first to re-seed.` }))
          controller.enqueue(event('done', { success: false }))
          controller.close()
          return
        }

        controller.enqueue(event('progress', { message: 'Calling AI to generate concept list...' }))

        const prompt = buildPrompt(subject.name, subject.board, subject.grade)
        const raw = await sarvamChat({ messages: [{ role: 'user', content: prompt }], max_tokens: 6000, temperature: 0.2 })

        controller.enqueue(event('progress', { message: 'Parsing AI response...' }))
        const concepts = extractJSONArray(raw)

        if (!Array.isArray(concepts) || concepts.length === 0) {
          throw new Error('AI returned empty concept list')
        }

        controller.enqueue(event('progress', { message: `Inserting ${concepts.length} concepts into database...` }))
        await insertConcepts(subject.id, subject.grade, concepts)

        controller.enqueue(event('done', { success: true, count: concepts.length, concepts: concepts.map((c) => c.title) }))
      } catch (err: any) {
        controller.enqueue(event('error', { message: err?.message ?? 'Unknown error' }))
        controller.enqueue(event('done', { success: false }))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// DELETE /api/admin/seed?subjectId=  — delete all concepts for a subject (allows re-seeding)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const subjectId = searchParams.get('subjectId')
  if (!subjectId) return NextResponse.json({ error: 'subjectId required' }, { status: 400 })

  // Delete in order: content → questions → objectives → concepts
  const concepts = await prisma.concept.findMany({ where: { subjectId }, select: { id: true } })
  const ids = concepts.map((c) => c.id)

  await prisma.conceptContent.deleteMany({ where: { conceptId: { in: ids } } })
  await prisma.question.deleteMany({ where: { conceptId: { in: ids } } })
  await prisma.learningObjective.deleteMany({ where: { conceptId: { in: ids } } })
  await prisma.concept.deleteMany({ where: { subjectId } })

  return NextResponse.json({ deleted: ids.length })
}
