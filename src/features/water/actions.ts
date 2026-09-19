'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeWaterBill, type WaterBillBreakdown } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getWaterBills(platformId: string) {
  const session = await auth()
  if (!session?.user) return []

  const bills = await prisma.bill.findMany({
    where: { serviceType: 'WATER', client: { platformId } },
    include: { client: { select: { name: true } }, reading: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return bills.map(b => ({
    ...b,
    amount: Number(b.amount),
    amountPaid: Number(b.amountPaid),
    reading: b.reading
      ? {
          ...b.reading,
          previousReading: Number(b.reading.previousReading),
          currentReading: Number(b.reading.currentReading),
          consumption: Number(b.reading.consumption),
          consumptionCost: Number(b.reading.consumptionCost),
          electricityFee: Number(b.reading.electricityFee),
          pumpServiceFee: Number(b.reading.pumpServiceFee),
          defaultTaxShare: Number(b.reading.defaultTaxShare),
        }
      : null,
  }))
}

export async function getPreviousReading(clientId: string): Promise<number | null> {
  const session = await auth()
  if (!session?.user) return null

  const last = await prisma.waterReading.findFirst({
    where: { clientId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return last ? Number(last.currentReading) : null
}

async function countActiveWaterTenants(platformId: string): Promise<number> {
  return prisma.client.count({
    where: { platformId, isActive: true, services: { some: { type: 'WATER' } } },
  })
}

export async function previewWaterBill(
  currentReading: number,
  previousReading: number,
  platformId: string,
): Promise<ActionResult<WaterBillBreakdown>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (currentReading < previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }
  const tenants = await countActiveWaterTenants(platformId)
  return { success: true, data: computeWaterBill(currentReading, previousReading, tenants) }
}

interface GenerateWaterBillInput {
  clientId: string
  platformId: string
  month: number
  year: number
  currentReading: number
  previousReading: number
}

export async function generateWaterBill(input: GenerateWaterBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (input.currentReading < input.previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }

  const client = await prisma.client.findUnique({ where: { id: input.clientId, platformId: input.platformId } })
  if (!client || !client.isActive) return { success: false, error: 'Client is not active.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'WATER', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const tenants = await countActiveWaterTenants(input.platformId)
  const breakdown = computeWaterBill(input.currentReading, input.previousReading, tenants)

  const bill = await prisma.bill.create({
    data: {
      clientId: input.clientId,
      serviceType: 'WATER',
      month: input.month,
      year: input.year,
      amount: breakdown.total,
      reading: {
        create: {
          clientId: input.clientId,
          month: input.month,
          year: input.year,
          previousReading: input.previousReading,
          currentReading: input.currentReading,
          consumption: breakdown.consumption,
          consumptionCost: breakdown.consumptionCost,
          electricityFee: breakdown.electricityFee,
          pumpServiceFee: breakdown.pumpServiceFee,
          defaultTaxShare: breakdown.defaultTaxShare,
        },
      },
    },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true, data: { id: bill.id } }
}

export async function updateWaterBill(
  billId: string,
  platformId: string,
  input: { month: number; year: number; currentReading: number; previousReading: number },
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (input.currentReading < input.previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (Number(bill.amountPaid) > 0) return { success: false, error: 'Cannot edit a bill that has a payment recorded.' }

  const tenants = await countActiveWaterTenants(platformId)
  const breakdown = computeWaterBill(input.currentReading, input.previousReading, tenants)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.bill.update({
        where: { id: billId },
        data: { month: input.month, year: input.year, amount: breakdown.total },
      })
      await tx.waterReading.update({
        where: { billId },
        data: {
          month: input.month,
          year: input.year,
          previousReading: input.previousReading,
          currentReading: input.currentReading,
          consumption: breakdown.consumption,
          consumptionCost: breakdown.consumptionCost,
          electricityFee: breakdown.electricityFee,
          pumpServiceFee: breakdown.pumpServiceFee,
          defaultTaxShare: breakdown.defaultTaxShare,
        },
      })
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A bill already exists for this client and period.' }
    }
    console.error('updateWaterBill failed:', error)
    return { success: false, error: 'Failed to update bill.' }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true, data: undefined }
}
