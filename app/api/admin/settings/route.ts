import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { getAppSettings, invalidateSettingsCache, DEFAULT_SETTINGS } from '@/lib/db/appSettings'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const settings = await getAppSettings()
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as Record<string, string>

  // Validate token values are positive integers
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('token_')) {
      const n = parseInt(value)
      if (isNaN(n) || n < 100 || n > 32000) {
        return NextResponse.json({ error: `Invalid token limit for ${key}: must be 100–32000` }, { status: 400 })
      }
    }
  }

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  )

  invalidateSettingsCache()
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { key } = await req.json()
  await prisma.appSetting.deleteMany({ where: { key } })
  invalidateSettingsCache()
  return NextResponse.json({ ok: true })
}
