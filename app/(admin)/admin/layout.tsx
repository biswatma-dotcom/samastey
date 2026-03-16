import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AdminNav } from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-800 bg-gray-900 lg:block">
        <div className="flex h-14 items-center border-b border-gray-800 px-4">
          <Link href="/admin" className="text-base font-bold bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Samastey Admin
          </Link>
        </div>
        <AdminNav />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-6 lg:hidden">
          <Link href="/admin" className="text-base font-bold bg-gradient-to-b from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Admin
          </Link>
          <AdminNav mobile />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
