import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getSubjectsByGradeAndBoard } from '@/lib/db/queries/concepts'
import { SubjectAccordion } from '@/components/subjects/SubjectAccordion'

export default async function SubjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
  })
  if (!student) redirect('/login')

  const subjects = await getSubjectsByGradeAndBoard(student.grade, student.board)

  const records = await prisma.learningRecord.findMany({
    where: { studentId: student.id },
  })
  const recordMap = new Map(records.map((r: any) => [r.conceptId, r]))

  // Shape data for the client accordion component
  const subjectGroups = subjects.map((subject: any) => {
    const concepts = subject.concepts.map((concept: any, idx: number) => {
      const record = recordMap.get(concept.id) as any
      const mastered = !!record?.masteryAchieved
      const inProgress = record && !mastered && record.masteryScore > 0
      const prevConcept = subject.concepts[idx - 1]
      const prereqMet = !prevConcept || (recordMap.get(prevConcept.id) as any)?.masteryAchieved

      return {
        id: concept.id,
        title: concept.title,
        estimatedMinutes: concept.estimatedMinutes,
        mastered,
        inProgress: !!inProgress,
        prereqMet: !!prereqMet,
        masteryScore: record?.masteryScore ?? 0,
      }
    })

    const masteredCount = concepts.filter((c: any) => c.mastered).length

    return {
      id: subject.id,
      name: subject.name,
      concepts,
      masteredCount,
      totalCount: concepts.length,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Class {student.grade} {student.board} Subjects
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {subjectGroups.length} subjects · {subjectGroups.reduce((s: number, g: any) => s + g.totalCount, 0)} concepts
        </p>
      </div>

      <SubjectAccordion subjects={subjectGroups} />
    </div>
  )
}
