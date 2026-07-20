'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeWaterBill, type WaterBillBreakdown } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getWaterBills() {
  const session = await auth()
  if (!session?.user) return []

  return prisma.bill.findMany({
    where: { serviceType: 'WATER' },
    include: { client: { select: { name: true } }, reading: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
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

async function countActiveWaterTenants(): Promise<number> {
  return prisma.client.count({
    where: { isActive: true, services: { some: { type: 'WATER' } } },
  })
}

export async function previewWaterBill(
  currentReading: number,
  previousReading: number,
): Promise<ActionResult<WaterBillBreakdown>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (currentReading < previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }
  const tenants = await countActiveWaterTenants()
  return { success: true, data: computeWaterBill(currentReading, previousReading, tenants) }
}

interface GenerateWaterBillInput {
  clientId: string
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

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'WATER', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const tenants = await countActiveWaterTenants()
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

  revalidatePath('/dashboard/water-bills')
  return { success: true, data: { id: bill.id } }
}
