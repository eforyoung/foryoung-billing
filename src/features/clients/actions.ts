'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'
import type { ClientFormInput, ClientWithServices } from './types'

export async function getClients(): Promise<ClientWithServices[]> {
  const clients = await prisma.client.findMany({
    include: { services: true },
    orderBy: { name: 'asc' },
  })
  return clients.map(c => ({
    ...c,
    services: c.services.map(s => ({ type: s.type, rate: s.rate ? Number(s.rate) : null })),
  }))
}

export async function getClientsForDropdown(serviceType?: ServiceType) {
  const clients = await prisma.client.findMany({
    where: {
      isActive: true,
      ...(serviceType ? { services: { some: { type: serviceType } } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return clients
}

export async function saveClient(input: ClientFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (!input.name.trim() || !input.phone.trim()) return { success: false, error: 'Name and phone are required.' }

  const data = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    unit: input.unit?.trim() || null,
    isActive: input.isActive,
    notes: input.notes?.trim() || null,
  }

  const client = input.id
    ? await prisma.client.update({ where: { id: input.id }, data })
    : await prisma.client.create({ data })

  await prisma.clientService.deleteMany({ where: { clientId: client.id } })
  if (input.services.length > 0) {
    await prisma.clientService.createMany({
      data: input.services.map(s => ({ clientId: client.id, type: s.type, rate: s.rate ?? null })),
    })
  }

  revalidatePath('/dashboard/clients')
  return { success: true, data: { id: client.id } }
}

export async function toggleClientActive(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return { success: false, error: 'Client not found' }

  await prisma.client.update({ where: { id }, data: { isActive: !client.isActive } })
  revalidatePath('/dashboard/clients')
  return { success: true, data: undefined }
}
