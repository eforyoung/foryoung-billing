import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'
import { ReportsView } from '@/features/reports/ReportsView'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function ReportsPage({ params }: Props) {
  const { platformSlug } = await params
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard/' + platformSlug)

  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  return <ReportsView platformId={platform.id} />
}
