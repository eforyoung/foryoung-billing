'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeInternetTotal, findArrears, type ArrearsSummary } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getInternetBills() {
  const session = await auth()
  if (!session?.user) return []

  const bills = await prisma.bill.findMany({
    where: { serviceType: 'INTERNET' },
    include: { client: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return bills.map(b => ({
    ...b,
    amount: Number(b.amount),
    amountPaid: Number(b.amountPaid),
  }))
}

export async function checkInternetArrears(clientId: string, month: number, year: number): Promise<ArrearsSummary> {
  const session = await auth()
  if (!session?.user) return { bills: [], totalMonths: 0, totalAmount: 0 }

  // Only fully-untouched unpaid bills are eligible for consolidation — a bill with a
  // partial payment already recorded must stay standalone (its own history stays
  // intact, and deleting it here would violate the Payment foreign key).
  const unpaid = await prisma.bill.findMany({
    where: { clientId, serviceType: 'INTERNET', isPaid: false, amountPaid: 0 },
  })
  return findArrears(
    unpaid.map(b => ({ id: b.id, month: b.month, year: b.year, monthsCount: b.monthsCount, amount: Number(b.amount) })),
    month,
    year,
  )
}

interface GenerateInternetBillInput {
  clientId: string
  month: number
  year: number
  monthsCount: number
  consolidate?: boolean
  dueDate?: string
}

export async function generateInternetBill(input: GenerateInternetBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } })
  if (!client || !client.isActive) return { success: false, error: 'Client is not active.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'INTERNET', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  try {
    let supersededIds: string[] = []
    let monthsCount = Math.max(1, input.monthsCount)

    if (input.consolidate) {
      const unpaid = await prisma.bill.findMany({
        where: { clientId: input.clientId, serviceType: 'INTERNET', isPaid: false, amountPaid: 0 },
      })
      const arrears = findArrears(
        unpaid.map(b => ({ id: b.id, month: b.month, year: b.year, monthsCount: b.monthsCount, amount: Number(b.amount) })),
        input.month,
        input.year,
      )
      supersededIds = arrears.bills.map(b => b.id)
      monthsCount = arrears.totalMonths + 1
    }

    const amount = computeInternetTotal(monthsCount)

    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          clientId: input.clientId,
          serviceType: 'INTERNET',
          month: input.month,
          year: input.year,
          monthsCount,
          amount,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      })

      if (supersededIds.length > 0) {
        await tx.bill.deleteMany({ where: { id: { in: supersededIds } } })
      }

      return created
    })

    revalidatePath('/dashboard/internet-bills')
    revalidatePath('/dashboard/payments')
    return { success: true, data: { id: bill.id } }
  } catch (error) {
    console.error('generateInternetBill failed:', error)
    return { success: false, error: 'Failed to generate bill.' }
  }
}

export async function updateInternetBill(
  billId: string,
  input: { month: number; year: number; monthsCount: number; dueDate?: string },
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (Number(bill.amountPaid) > 0) return { success: false, error: 'Cannot edit a bill that has a payment recorded.' }

  const monthsCount = Math.max(1, input.monthsCount)
  const amount = computeInternetTotal(monthsCount)

  try {
    await prisma.bill.update({
      where: { id: billId },
      data: {
        month: input.month,
        year: input.year,
        monthsCount,
        amount,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A bill already exists for this client and period.' }
    }
    console.error('updateInternetBill failed:', error)
    return { success: false, error: 'Failed to update bill.' }
  }

  revalidatePath('/dashboard/internet-bills')
  return { success: true, data: undefined }
}
