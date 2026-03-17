import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const conceptId = formData.get('conceptId') as string | null
  const title = (formData.get('title') as string) || 'Reference Material'
  const source = (formData.get('source') as string) || null

  if (!file || !conceptId) {
    return NextResponse.json({ error: 'file and conceptId required' }, { status: 400 })
  }

  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let extracted: string
  try {
    const result = await pdfParse(buffer)
    extracted = result.text?.trim() ?? ''
  } catch (e: any) {
    return NextResponse.json({ error: `PDF parsing failed: ${e?.message ?? 'unknown error'}` }, { status: 422 })
  }

  if (!extracted || extracted.length < 20) {
    return NextResponse.json({ error: 'Could not extract text from PDF (may be image-based or encrypted)' }, { status: 422 })
  }

  // Clean up excessive whitespace from PDF extraction
  const cleaned = extracted
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{3,}/g, '  ')
    .trim()

  const material = await prisma.conceptMaterial.create({
    data: {
      conceptId,
      title: title || file.name.replace(/\.pdf$/i, ''),
      content: cleaned,
      source: source || file.name,
    },
  })

  return NextResponse.json({ ...material, extractedLength: cleaned.length })
}
