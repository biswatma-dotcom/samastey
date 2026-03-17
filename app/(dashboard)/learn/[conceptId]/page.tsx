import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getConceptById } from '@/lib/db/queries/concepts'
import { ConceptExplainer } from '@/components/learn/ConceptExplainer'

interface Props {
  params: { conceptId: string }
}

export default async function LearnConceptPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const [concept, student] = await Promise.all([
    getConceptById(params.conceptId),
    prisma.student.findUnique({ where: { userId: (session.user as any).id } }),
  ])

  if (!concept) notFound()
  if (!student) redirect('/login')

  // Start or resume learning session
  let activeSession = await prisma.learningSession.findFirst({
    where: { studentId: student.id, conceptId: params.conceptId, endedAt: null },
  })

  if (!activeSession) {
    activeSession = await prisma.learningSession.create({
      data: { studentId: student.id, conceptId: params.conceptId },
    })
    // Track "explored" in LearningRecord + award XP for starting
    await Promise.all([
      prisma.learningRecord.upsert({
        where: { studentId_conceptId: { studentId: student.id, conceptId: params.conceptId } },
        create: { studentId: student.id, conceptId: params.conceptId, attempts: 1, lastAttemptAt: new Date() },
        update: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
      }),
      prisma.student.update({
        where: { id: student.id },
        data: { xpTotal: { increment: 10 }, lastActiveAt: new Date() },
      }),
    ])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <a href="/subjects" className="hover:text-orange-600">Subjects</a>
        <span>/</span>
        <span>{concept.subject.name}</span>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{concept.title}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{concept.title}</h1>
      <p className="text-sm text-gray-500">{concept.description}</p>

      <ConceptExplainer
        conceptId={params.conceptId}
        conceptTitle={concept.title}
        objectives={concept.objectives}
      />
    </div>
  )
}
