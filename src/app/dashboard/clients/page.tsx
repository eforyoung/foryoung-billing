import { getClients } from '@/features/clients/actions'
import { ClientList } from '@/features/clients/ClientList'

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientList clients={clients} />
}
