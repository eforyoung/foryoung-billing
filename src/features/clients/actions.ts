'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'
import type { ClientFormInput, ClientWithServices } from './types'

export async function getClients(platformId: string): Promise<ClientWithServices[]> {
  const session = await auth()
  if (!session?.user) return []

  const clients = await prisma.client.findMany({
    where: { platformId },
    include: { services: true },
    orderBy: { name: 'asc' },
  })
  return clients.map(c => ({
    ...c,
    services: c.services.map(s => ({ type: s.type, rate: s.rate ? Number(s.rate) : null })),
  }))
}

export async function getClientsForDropdown(platformId: string, serviceType?: ServiceType) {
  const session = await auth()
  if (!session?.user) return []

  const clients = await prisma.client.findMany({
    where: {
      platformId,
      isActive: true,
      ...(serviceType ? { services: { some: { type: serviceType } } } : {}),
    },
    select: { id: true, name: true, unit: true },
    orderBy: { name: 'asc' },
  })
  return clients
}

export async function saveClient(input: ClientFormInput, platformId: string): Promise<ActionResult<{ id: string }>> {
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

  try {
    const client = await prisma.$transaction(async (tx) => {
      const client = input.id
        ? await tx.client.update({ where: { id: input.id, platformId }, data })
        : await tx.client.create({ data: { ...data, platformId } })

      await tx.clientService.deleteMany({ where: { clientId: client.id } })
      if (input.services.length > 0) {
        await tx.clientService.createMany({
          data: input.services.map(s => ({ clientId: client.id, type: s.type, rate: s.rate ?? null })),
        })
      }

      return client
    })

    revalidatePath('/dashboard', 'layout')
    return { success: true, data: { id: client.id } }
  } catch (error) {
    console.error('saveClient failed:', error)
    return { success: false, error: 'Failed to save client.' }
  }
}

export async function toggleClientActive(id: string, platformId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id, platformId } })
  if (!client) return { success: false, error: 'Client not found' }

  await prisma.client.update({ where: { id }, data: { isActive: !client.isActive } })
  revalidatePath('/dashboard', 'layout')
  return { success: true, data: undefined }
}
