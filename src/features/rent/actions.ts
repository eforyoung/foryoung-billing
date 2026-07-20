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
  amount: number
  monthsCount: number
}

export async function generateRentBill(input: GenerateRentBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } })
  if (!client || !client.isActive) return { success: false, error: 'Client is not active.' }

  const service = await prisma.clientService.findUnique({
    where: { clientId_type: { clientId: input.clientId, type: 'RENT' } },
  })
  if (!service) return { success: false, error: 'Client has no rent rate configured.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'RENT', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const amount = computeRentTotal(input.amount, input.monthsCount)
  const bill = await prisma.bill.create({
    data: {
      clientId: input.clientId,
      serviceType: 'RENT',
      month: input.month,
      year: input.year,
      amount,
      monthsCount: input.monthsCount,
    },
  })

  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: { id: bill.id } }
}

export async function getClientRentRate(clientId: string): Promise<number | null> {
  const session = await auth()
  if (!session?.user) return null

  const service = await prisma.clientService.findUnique({
    where: { clientId_type: { clientId, type: 'RENT' } },
  })
  return service?.rate ? Number(service.rate) : null
}

export async function updateRentBill(
  billId: string,
  input: { month: number; year: number; amount: number; monthsCount: number },
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (bill.isPaid) return { success: false, error: 'Cannot edit a paid bill.' }

  const amount = computeRentTotal(input.amount, input.monthsCount)

  try {
    await prisma.bill.update({
      where: { id: billId },
      data: { month: input.month, year: input.year, amount, monthsCount: input.monthsCount },
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A bill already exists for this client and period.' }
    }
    console.error('updateRentBill failed:', error)
    return { success: false, error: 'Failed to update bill.' }
  }

  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: undefined }
}
