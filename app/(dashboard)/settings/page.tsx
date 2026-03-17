import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
    include: { user: { select: { name: true, email: true } } },
  })
  if (!student) redirect('/login')

  return (
    <SettingsClient
      student={{
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        grade: student.grade,
        board: student.board,
        learningPace: student.learningPace,
        language: student.language || 'en',
        xpTotal: student.xpTotal,
        streakDays: student.streakDays,
      }}
    />
  )
}
