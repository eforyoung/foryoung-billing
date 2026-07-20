'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'

interface PaymentFilters {
  month?: number
  year?: number
  serviceType?: ServiceType
}

export async function getPayments(filters: PaymentFilters) {
  const session = await auth()
  if (!session?.user) return []

  return prisma.bill.findMany({
    where: {
      isPaid: true,
      ...(filters.month ? { month: filters.month } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
    },
    include: { client: { select: { name: true, phone: true } }, payment: true },
    orderBy: { paidDate: 'desc' },
  })
}

export async function getUnpaidBills() {
  const session = await auth()
  if (!session?.user) return []

  return prisma.bill.findMany({
    where: { isPaid: false },
    include: { client: { select: { name: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })
}

export async function markBillPaid(billId: string, paymentDate: string, notes?: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (bill.isPaid) return { success: false, error: 'Bill is already marked as paid' }

  const paidDateObj = new Date(paymentDate)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bill.update({ where: { id: billId }, data: { isPaid: true, paidDate: paidDateObj } })
      await tx.payment.create({
        data: {
          billId,
          amountPaid: bill.amount,
          paymentDate: paidDateObj,
          notes,
          recordedBy: session.user.id,
        },
      })
    })
  } catch (error) {
    console.error('markBillPaid failed:', error)
    return { success: false, error: 'Failed to record payment.' }
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/internet-bills')
  revalidatePath('/dashboard/water-bills')
  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: undefined }
}
