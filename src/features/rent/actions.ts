'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeRentTotal } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getRentBills() {
  const session = await auth()
  if (!session?.user) return []

  const bills = await prisma.bill.findMany({
    where: { serviceType: 'RENT' },
    include: { client: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return bills.map(b => ({
    ...b,
    amount: Number(b.amount),
  }))
}

interface GenerateRentBillInput {
  clientId: string
  month: number
  year: number
}

export async function generateRentBill(input: GenerateRentBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } })
  if (!client || !client.isActive) return { success: false, error: 'Client is not active.' }

  const service = await prisma.clientService.findUnique({
    where: { clientId_type: { clientId: input.clientId, type: 'RENT' } },
  })
  if (!service || service.rate === null) return { success: false, error: 'Client has no rent rate configured.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'RENT', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const amount = computeRentTotal(Number(service.rate))
  const bill = await prisma.bill.create({
    data: { clientId: input.clientId, serviceType: 'RENT', month: input.month, year: input.year, amount },
  })

  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: { id: bill.id } }
}
