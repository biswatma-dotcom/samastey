import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateMasteryDelta, calculateNewMasteryScore, calculateXPEarned } from '@/lib/ai/evaluator'
import { evaluateBoardAnswer } from '@/lib/ai/questionGenerator'
import { createOrUpdateLearningRecord, updateStudentXP } from '@/lib/db/queries/student'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conceptId, questionId, studentAnswer, hintsUsed = 0, correctStreak = 0 } = await req.json()

  if (!conceptId || !questionId || !studentAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [student, question] = await Promise.all([
    prisma.student.findUnique({ where: { userId: (session.user as any).id } }),
    prisma.question.findUnique({ where: { id: questionId } }),
  ])

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const isBoardQuestion = question.type.startsWith('board_')
  let evaluation: any

  if (isBoardQuestion) {
    // LLM-based evaluation with marks
    const marks = parseInt(question.type.split('_')[1]) || 3
    const markingScheme = question.explanation
      ? question.explanation.split('\n').filter(Boolean)
      : []
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: { subject: true },
    })
    const boardEval = await evaluateBoardAnswer({
      problem: question.problem,
      modelAnswer: question.answer,
      markingScheme,
      studentAnswer,
      marks,
      conceptTitle: concept?.title ?? '',
      board: student.board,
    })
    evaluation = {
      isCorrect: boardEval.isCorrect,
      partialCredit: boardEval.partialCredit,
      feedback: boardEval.feedback,
      mistakeType: boardEval.mistakeType,
      marksAwarded: boardEval.marksAwarded,
      marksTotal: boardEval.marksTotal,
      markingBreakdown: boardEval.markingBreakdown,
    }
  } else {
    // Direct comparison for MCQ — no AI needed
    const normalise = (s: string) => s.trim().toLowerCase()
    const isCorrect = normalise(studentAnswer) === normalise(question.answer)
    evaluation = {
      isCorrect,
      partialCredit: isCorrect ? 100 : 0,
      feedback: isCorrect
        ? 'Correct! ' + question.explanation
        : `Not quite. The correct answer is: ${question.answer}. ${question.explanation}`,
      mistakeType: isCorrect ? null : 'conceptual',
    }
  }

  // Get current mastery score
  const currentRecord = await prisma.learningRecord.findFirst({
    where: { studentId: student.id, conceptId },
  })

  const delta = calculateMasteryDelta({ isCorrect, hintsUsed, correctStreak })
  const currentScore = currentRecord?.masteryScore ?? 0
  const newScore = calculateNewMasteryScore(currentScore, delta)
  const masteryAchievedNow = newScore >= 80
  const wasAlreadyMastered = currentRecord?.masteryAchieved ?? false

  // Update records
  const activeSession = await prisma.learningSession.findFirst({
    where: { studentId: student.id, conceptId, endedAt: null },
  })
  const sessionId = activeSession?.id ?? (
    await prisma.learningSession.create({ data: { studentId: student.id, conceptId } })
  ).id

  await Promise.all([
    createOrUpdateLearningRecord(student.id, conceptId, newScore),
    prisma.interaction.create({
      data: { sessionId, type: 'QUESTION_ANSWER', userInput: studentAnswer, correct: isCorrect },
    }),
  ])

  const xpEarned = calculateXPEarned({ isCorrect, conceptMasteredNow: masteryAchievedNow, wasAlreadyMastered })
  if (xpEarned > 0) await updateStudentXP(student.id, xpEarned)

  return NextResponse.json({
    evaluation,
    masteryScore: newScore,
    masteryAchieved: masteryAchievedNow,
    masteryJustUnlocked: masteryAchievedNow && !wasAlreadyMastered,
    xpEarned,
  })
}
