import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { ReportsView } from '@/features/reports/ReportsView'

export default async function ReportsPage() {
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard')
  return <ReportsView />
}
