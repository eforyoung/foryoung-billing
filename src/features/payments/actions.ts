'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'

interface PaymentFilters {
  platformId: string
  month?: number
  year?: number
  serviceType?: ServiceType
}

export async function getPayments(filters: PaymentFilters) {
  const session = await auth()
  if (!session?.user) return []

  const payments = await prisma.payment.findMany({
    where: {
      bill: {
        client: { platformId: filters.platformId },
        ...(filters.month ? { month: filters.month } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
      },
    },
    include: {
      bill: {
        include: {
          client: { select: { name: true, phone: true, unit: true } },
          reading: true,
          payments: { select: { amountPaid: true, paymentDate: true } },
        },
      },
    },
    orderBy: { paymentDate: 'desc' },
  })

  return payments.map(p => {
    const billAmount = Number(p.bill.amount)
    const paidAsOfThisPayment = p.bill.payments
      .filter(sib => sib.paymentDate.getTime() <= p.paymentDate.getTime())
      .reduce((s, sib) => s + Number(sib.amountPaid), 0)
    const balanceAfter = Math.max(0, billAmount - paidAsOfThisPayment)

    return {
      id: p.id,
      billId: p.billId,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate,
      notes: p.notes,
      balanceAfter,
      bill: {
        id: p.bill.id,
        serviceType: p.bill.serviceType,
        month: p.bill.month,
        year: p.bill.year,
        monthsCount: p.bill.monthsCount,
        amount: billAmount,
        dueDate: p.bill.dueDate,
        client: p.bill.client,
        reading: p.bill.reading
          ? { consumption: Number(p.bill.reading.consumption), consumptionCost: Number(p.bill.reading.consumptionCost) }
          : null,
      },
    }
  })
}

export async function getUnpaidBills(platformId: string) {
  const session = await auth()
  if (!session?.user) return []

  const bills = await prisma.bill.findMany({
    where: { isPaid: false, client: { platformId } },
    include: { client: { select: { name: true, phone: true, unit: true } }, reading: true },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })
  return bills.map(b => ({
    ...b,
    amount: Number(b.amount),
    amountPaid: Number(b.amountPaid),
    reading: b.reading
      ? { consumption: Number(b.reading.consumption), consumptionCost: Number(b.reading.consumptionCost) }
      : null,
  }))
}

export async function recordPayment(
  billId: string,
  amount: number,
  paymentDate: string,
  notes?: string,
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (bill.isPaid) return { success: false, error: 'Bill is already fully paid.' }

  const billAmount = Number(bill.amount)
  const alreadyPaid = Number(bill.amountPaid)
  const remaining = billAmount - alreadyPaid

  if (!(amount > 0)) return { success: false, error: 'Payment amount must be greater than zero.' }
  if (amount > remaining) {
    return {
      success: false,
      error: `Amount exceeds the remaining balance of ${remaining.toLocaleString('en-US')} XAF.`,
    }
  }

  const paidDateObj = new Date(paymentDate)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          billId,
          amountPaid: amount,
          paymentDate: paidDateObj,
          notes,
          recordedBy: session.user.id,
        },
      })
      const updated = await tx.bill.update({
        where: { id: billId },
        data: { amountPaid: { increment: amount } },
      })
      if (Number(updated.amountPaid) >= billAmount) {
        await tx.bill.update({ where: { id: billId }, data: { isPaid: true, paidDate: paidDateObj } })
      }
    })
  } catch (error) {
    console.error('recordPayment failed:', error)
    return { success: false, error: 'Failed to record payment.' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, data: undefined }
}
