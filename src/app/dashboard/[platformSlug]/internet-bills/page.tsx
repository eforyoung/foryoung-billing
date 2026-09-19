import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'
import { InternetBillList } from '@/features/internet/InternetBillList'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function InternetBillsPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  return <InternetBillList platformId={platform.id} />
}
