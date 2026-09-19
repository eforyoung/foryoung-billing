import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'
import { RentBillList } from '@/features/rent/RentBillList'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function RentBillsPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  return <RentBillList platformId={platform.id} />
}
