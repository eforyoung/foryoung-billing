import { DashboardView } from '@/features/dashboard/DashboardView'
import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function DashboardPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  return <DashboardView platformId={platform.id} />
}
