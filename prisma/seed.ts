import { PrismaClient } from '@prisma/client'
import { CBSE_CLASS10_MATH } from '../lib/curriculum/cbse-class10-math'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create subject
  const subject = await prisma.subject.upsert({
    where: { code: CBSE_CLASS10_MATH.subject.code },
    update: {},
    create: CBSE_CLASS10_MATH.subject,
  })

  console.log(`Created subject: ${subject.name}`)

  // Create concepts (without prerequisites first)
  const createdConcepts: Record<string, string> = {} // title -> id

  for (const conceptData of CBSE_CLASS10_MATH.concepts) {
    const { prerequisites, objectives, ...data } = conceptData

    const concept = await prisma.concept.upsert({
      where: {
        // Use a unique compound check via findFirst then create
        id: (
          await prisma.concept.findFirst({
            where: { title: data.title, subjectId: subject.id },
          })
        )?.id ?? 'nonexistent',
      },
      update: {},
      create: {
        ...data,
        grade: 10,
        subjectId: subject.id,
        objectives: {
          create: objectives.map((desc, idx) => ({
            description: desc,
            orderIndex: idx + 1,
          })),
        },
      },
      include: { objectives: true },
    })

    createdConcepts[data.title] = concept.id
    console.log(`Created concept: ${data.title}`)
  }

  // Now wire up prerequisites
  for (const conceptData of CBSE_CLASS10_MATH.concepts) {
    if (conceptData.prerequisites.length === 0) continue

    const conceptId = createdConcepts[conceptData.title]
    const prereqIds = conceptData.prerequisites
      .map((prereqTitle) => createdConcepts[prereqTitle])
      .filter(Boolean)

    if (prereqIds.length > 0) {
      await prisma.concept.update({
        where: { id: conceptId },
        data: {
          prerequisites: {
            connect: prereqIds.map((id) => ({ id })),
          },
        },
      })
      console.log(`Linked prerequisites for: ${conceptData.title}`)
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
