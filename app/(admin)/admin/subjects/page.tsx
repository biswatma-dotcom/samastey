import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SubjectsManager } from './SubjectsManager'

export default async function AdminSubjectsPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">Subject Content Management</h1>
        <p className="text-sm text-gray-500 mt-1">Seed concepts, manage cached explanations, and monitor content coverage</p>
      </div>
      <SubjectsManager />
    </div>
  )
}
