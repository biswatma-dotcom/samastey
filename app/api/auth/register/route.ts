import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: role ?? 'STUDENT',
      },
    })

    // Auto-create student profile for students
    if (user.role === 'STUDENT') {
      await prisma.student.create({
        data: {
          userId: user.id,
          grade: 10,
          board: 'CBSE',
        },
      })
    }

    return NextResponse.json({ message: 'Account created', userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
