import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UsersTable } from './UsersTable'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-white">User Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">All registered students with learning metrics</p>
      </div>
      <UsersTable />
    </div>
  )
}
