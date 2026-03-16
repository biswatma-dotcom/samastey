/**
 * AI-powered concept seeder — generates CBSE/ICSE chapter topics for all subjects.
 * Run with: npx tsx prisma/seed-concepts.ts
 * Resumes safely — skips subjects that already have concepts.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Load .env
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

// Fresh Prisma client per reconnect
function newPrisma() {
  return new PrismaClient({ log: [] })
}
let prisma = newPrisma()

const SARVAM_BASE_URL = 'https://api.sarvam.ai'
const SARVAM_MODEL = 'sarvam-m'
const SARVAM_API_KEY = process.env.SARVAM_API_KEY!

interface ConceptJSON {
  title: string
  description: string
  estimatedMinutes: number
  objectives: string[]
  prerequisites: string[]
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function stripThinkTags(text: string): string {
  const closeIdx = text.lastIndexOf('</think>')
  if (closeIdx !== -1) {
    const after = text.slice(closeIdx + 8).trim()
    if (after.length > 20) return after
    return text.replace(/<think>([\s\S]*)<\/think>/i, '$1').trim()
  }
  return text.replace(/<think>/gi, '').trim()
}

/** Attempt to repair and parse a JSON array from the model response */
function extractJSONArray(text: string): ConceptJSON[] {
  const clean = stripThinkTags(text)
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array found in response')

  let raw = clean.slice(start, end + 1)

  // Common repairs:
  // 1. Remove trailing commas before ] or }
  raw = raw.replace(/,(\s*[}\]])/g, '$1')
  // 2. Remove control characters
  raw = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')

  try {
    return JSON.parse(raw)
  } catch {
    // Last resort: try to extract individual objects
    const objects: ConceptJSON[] = []
    const objRegex = /\{[\s\S]*?\}/g
    let match
    while ((match = objRegex.exec(raw)) !== null) {
      try {
        const obj = JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1'))
        if (obj.title && obj.description) objects.push(obj)
      } catch { /* skip malformed object */ }
    }
    if (objects.length > 0) return objects
    throw new Error('Could not parse JSON even after repair')
  }
}

async function callSarvam(prompt: string, retries = 4): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SARVAM_API_KEY}`,
        },
        body: JSON.stringify({
          model: SARVAM_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 6000,
          temperature: 0.2,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        if (res.status === 429 || res.status >= 500) {
          await sleep(Math.pow(2, attempt + 1) * 2000)
          continue
        }
        throw new Error(`Sarvam ${res.status}: ${err}`)
      }
      const data = await res.json()
      const msg = data.choices?.[0]?.message
      return msg?.content ?? msg?.reasoning_content ?? ''
    } catch (err: any) {
      if (attempt === retries - 1) throw err
      await sleep(Math.pow(2, attempt + 1) * 1000)
    }
  }
  throw new Error('Max retries exceeded')
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

/** Insert concepts for a subject, reconnecting Prisma if needed */
async function insertConcepts(
  subjectId: string,
  grade: number,
  concepts: ConceptJSON[],
  retries = 3
): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
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
        const prereqIds = c.prerequisites
          .map((pt: string) => titleToId[pt])
          .filter(Boolean) as string[]
        if (prereqIds.length > 0) {
          await prisma.concept.update({
            where: { id: conceptId },
            data: { prerequisites: { connect: prereqIds.map((id) => ({ id })) } },
          })
        }
      }
      return // success
    } catch (err: any) {
      const isConnectionErr = err?.message?.includes('Server has closed') ||
        err?.message?.includes('connection') ||
        err?.code === 'P1017'

      if (isConnectionErr && attempt < retries - 1) {
        // Reconnect and retry
        try { await prisma.$disconnect() } catch {}
        prisma = newPrisma()
        await sleep(5000)
        continue
      }
      throw err
    }
  }
}

async function main() {
  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { concepts: true } } },
    orderBy: [{ board: 'asc' }, { grade: 'asc' }, { name: 'asc' }],
  })

  const pending = subjects.filter((s) => s._count.concepts === 0)
  const already = subjects.length - pending.length

  console.log(`Total subjects:  ${subjects.length}`)
  console.log(`Already seeded:  ${already}`)
  console.log(`Pending:         ${pending.length}`)
  console.log()

  if (pending.length === 0) {
    console.log('All subjects seeded. Done.')
    return
  }

  let success = 0
  let errors = 0

  for (let i = 0; i < pending.length; i++) {
    const subject = pending[i]
    const label = `[${i + 1}/${pending.length}] ${subject.board} Class ${subject.grade} — ${subject.name}`
    process.stdout.write(`${label} ... `)

    try {
      const prompt = buildPrompt(subject.name, subject.board, subject.grade)
      const raw = await callSarvam(prompt)
      const concepts = extractJSONArray(raw)

      if (!Array.isArray(concepts) || concepts.length === 0) {
        throw new Error('Empty concepts array')
      }

      await insertConcepts(subject.id, subject.grade, concepts)
      console.log(`✓ ${concepts.length} concepts`)
      success++

      if (i < pending.length - 1) await sleep(1200)
    } catch (err: any) {
      console.log(`✗ ${err.message?.split('\n')[0]}`)
      errors++
      await sleep(3000)
    }
  }

  console.log()
  console.log('══════════════════════════════════')
  console.log(`✓ Success: ${success}`)
  console.log(`✗ Errors:  ${errors}`)
  console.log('══════════════════════════════════')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
