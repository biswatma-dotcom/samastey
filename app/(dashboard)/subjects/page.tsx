import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getSubjectsByGradeAndBoard } from '@/lib/db/queries/concepts'
import { SubjectAccordion } from '@/components/subjects/SubjectAccordion'
import { GradeFilter } from '@/components/shared/GradeFilter'

interface Props {
  searchParams: { grade?: string }
}

export default async function SubjectsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const student = await prisma.student.findUnique({
    where: { userId: (session.user as any).id },
  })
  if (!student) redirect('/login')

  const grade = searchParams.grade ? parseInt(searchParams.grade) : student.grade
  const validGrade = grade >= 1 && grade <= 12 ? grade : student.grade

  const subjects = await getSubjectsByGradeAndBoard(validGrade, student.board)

  const records = await prisma.learningRecord.findMany({
    where: { studentId: student.id },
  })
  const recordMap = new Map(records.map((r: any) => [r.conceptId, r]))

  const subjectGroups = subjects.map((subject: any) => {
    const concepts = subject.concepts.map((concept: any) => {
      const record = recordMap.get(concept.id) as any
      const mastered = !!record?.masteryAchieved
      const inProgress = record && !mastered && record.masteryScore > 0

      return {
        id: concept.id,
        title: concept.title,
        estimatedMinutes: concept.estimatedMinutes,
        mastered,
        inProgress: !!inProgress,
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

  const totalConcepts = subjectGroups.reduce((s: number, g: any) => s + g.totalCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Class {validGrade} · {student.board}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {subjectGroups.length} subjects · {totalConcepts} concepts
          </p>
        </div>
      </div>

      <Suspense>
        <GradeFilter currentGrade={validGrade} studentGrade={student.grade} />
      </Suspense>

      {subjectGroups.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">No subjects found for Class {validGrade} {student.board}.</p>
        </div>
      ) : (
        <SubjectAccordion subjects={subjectGroups} />
      )}
    </div>
  )
}
