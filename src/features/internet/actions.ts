'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeInternetTotal, findArrears, type ArrearsSummary } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getInternetBills() {
  const session = await auth()
  if (!session?.user) return []

  return prisma.bill.findMany({
    where: { serviceType: 'INTERNET' },
    include: { client: { select: { name: true } }, payment: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
}

export async function checkInternetArrears(clientId: string, month: number, year: number): Promise<ArrearsSummary> {
  const session = await auth()
  if (!session?.user) return { bills: [], totalMonths: 0, totalAmount: 0 }

  const unpaid = await prisma.bill.findMany({
    where: { clientId, serviceType: 'INTERNET', isPaid: false },
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
    let monthsCount = input.monthsCount

    if (input.consolidate) {
      const unpaid = await prisma.bill.findMany({
        where: { clientId: input.clientId, serviceType: 'INTERNET', isPaid: false },
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
