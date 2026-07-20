import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardShell } from '@/features/shell/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'
  const userName = session.user.name || session.user.email || 'User'

  return (
    <DashboardShell userName={userName} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  )
}
