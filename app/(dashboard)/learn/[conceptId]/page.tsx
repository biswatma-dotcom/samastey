import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getConceptById } from '@/lib/db/queries/concepts'
import { ConceptExplainer } from '@/components/learn/ConceptExplainer'
import { PracticeZoneWrapper } from './PracticeZoneWrapper'

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
    // Award XP for starting
    await prisma.student.update({
      where: { id: student.id },
      data: { xpTotal: { increment: 10 }, lastActiveAt: new Date() },
    })
  }

  const record = await prisma.learningRecord.findFirst({
    where: { studentId: student.id, conceptId: params.conceptId },
  })

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left panel: explanation (60%) */}
      <div className="lg:col-span-3 space-y-2">
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

      {/* Right panel: practice (40%) */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Practice Zone</h2>
          <PracticeZoneWrapper
            conceptId={params.conceptId}
            conceptTitle={concept.title}
            initialMasteryScore={record?.masteryScore ?? 0}
          />
        </div>
      </div>
    </div>
  )
}
