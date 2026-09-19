import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'
import { WaterBillList } from '@/features/water/WaterBillList'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function WaterBillsPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  return <WaterBillList platformId={platform.id} />
}
