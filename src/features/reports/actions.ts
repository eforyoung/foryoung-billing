'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export interface ReportData {
  month: number
  year: number
  internetCollected: number
  internetProviderCost: number
  internetProfit: number
  waterCollected: number
  waterProviderCost: number
  waterProfit: number
  rentCollected: number
  netProfit: number
}

export async function getReport(month: number, year: number): Promise<ReportData | { error: string }> {
  const session = await auth()
  if (!requireAdmin(session)) return { error: 'Forbidden' }

  const [internetBills, waterBills, rentBills, internetCost, waterCost] = await Promise.all([
    prisma.bill.findMany({ where: { serviceType: 'INTERNET', isPaid: true, month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'WATER', isPaid: true, month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'RENT', isPaid: true, month, year } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'INTERNET', month, year } } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'WATER', month, year } } }),
  ])

  const internetCollected = internetBills.reduce((s, b) => s + Number(b.amount), 0)
  const waterCollected = waterBills.reduce((s, b) => s + Number(b.amount), 0)
  const rentCollected = rentBills.reduce((s, b) => s + Number(b.amount), 0)
  const internetProviderCost = internetCost ? Number(internetCost.amount) : 0
  const waterProviderCost = waterCost ? Number(waterCost.amount) : 0
  const internetProfit = internetCollected - internetProviderCost
  const waterProfit = waterCollected - waterProviderCost

  return {
    month,
    year,
    internetCollected,
    internetProviderCost,
    internetProfit,
    waterCollected,
    waterProviderCost,
    waterProfit,
    rentCollected,
    netProfit: internetProfit + waterProfit + rentCollected,
  }
}

interface ProviderCostInput {
  serviceType: 'INTERNET' | 'WATER'
  month: number
  year: number
  amount: number
  notes?: string
}

export async function saveProviderCost(input: ProviderCostInput): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }

  await prisma.providerCost.upsert({
    where: { serviceType_month_year: { serviceType: input.serviceType, month: input.month, year: input.year } },
    update: { amount: input.amount, notes: input.notes },
    create: { ...input },
  })

  revalidatePath('/dashboard/reports')
  return { success: true, data: undefined }
}
