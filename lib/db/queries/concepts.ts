import { prisma } from '../prisma'

export async function getConceptById(id: string) {
  return prisma.concept.findUnique({
    where: { id },
    include: {
      subject: true,
      objectives: { orderBy: { orderIndex: 'asc' } },
      prerequisites: { select: { id: true, title: true } },
    },
  })
}

export async function getConceptsBySubject(subjectId: string) {
  return prisma.concept.findMany({
    where: { subjectId },
    orderBy: { orderIndex: 'asc' },
    include: {
      objectives: { orderBy: { orderIndex: 'asc' } },
      prerequisites: { select: { id: true, title: true } },
    },
  })
}

export async function getSubjectsByGradeAndBoard(grade: number, board: string) {
  return prisma.subject.findMany({
    where: { grade, board: board as any },
    include: {
      concepts: {
        orderBy: { orderIndex: 'asc' },
        select: { id: true, title: true, orderIndex: true, estimatedMinutes: true },
      },
    },
  })
}

export async function getNextConcept(subjectId: string, currentOrderIndex: number) {
  return prisma.concept.findFirst({
    where: { subjectId, orderIndex: { gt: currentOrderIndex } },
    orderBy: { orderIndex: 'asc' },
  })
}
