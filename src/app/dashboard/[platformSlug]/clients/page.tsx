import { getClients } from '@/features/clients/actions'
import { ClientList } from '@/features/clients/ClientList'
import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function ClientsPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  const clients = await getClients(platform.id)
  return <ClientList clients={clients} platformId={platform.id} />
}
