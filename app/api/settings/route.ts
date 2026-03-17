import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

// Returns API config status (key presence only — never the actual value)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    anthropicKeySet: !!process.env.ANTHROPIC_API_KEY,
    sarvamKeySet: !!process.env.SARVAM_API_KEY,
    googleOAuthSet: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    databaseConnected: true, // if we got here, DB is connected
    aiModel: 'claude-sonnet-4-6',
    masteryThreshold: 80,
  })
}

// Update student learning preferences + profile
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { learningStyle, learningPace, grade, board, language, name, currentPassword, newPassword } = await req.json()

  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Handle password change
  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    const bcrypt = await import('bcryptjs')
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.password) return NextResponse.json({ error: 'No password set (OAuth account)' }, { status: 400 })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  }

  // Handle name change
  if (name?.trim()) {
    await prisma.user.update({ where: { id: userId }, data: { name: name.trim() } })
  }

  // Handle student preferences
  const updates: any = {}
  if (learningStyle) updates.learningStyle = learningStyle
  if (learningPace) updates.learningPace = learningPace
  if (grade) updates.grade = parseInt(grade)
  if (board) updates.board = board
  if (language) updates.language = language

  const updated = await prisma.student.update({ where: { id: student.id }, data: updates })

  return NextResponse.json({ ok: true, student: updated })
}
