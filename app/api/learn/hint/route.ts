import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateHint } from '@/lib/ai/explainer'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { problem, hintNumber, conceptTitle, studentAnswer } = await req.json()

  if (!problem || !hintNumber || !conceptTitle) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (hintNumber < 1 || hintNumber > 3) {
    return NextResponse.json({ error: 'hintNumber must be 1-3' }, { status: 400 })
  }

  const hint = await generateHint({ problem, hintNumber, conceptTitle, studentAnswer })

  return NextResponse.json({ hint })
}
