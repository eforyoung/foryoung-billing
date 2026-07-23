'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import { monthName } from '@/lib/utils'
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
  variableCosts: { id: string; label: string; amount: number; notes: string | null }[]
  totalVariableCosts: number
}

export async function getReport(month: number, year: number): Promise<ReportData | { error: string }> {
  const session = await auth()
  if (!requireAdmin(session)) return { error: 'Forbidden' }

  const [internetBills, waterBills, rentBills, internetCost, waterCost, variableCostRows] = await Promise.all([
    prisma.bill.findMany({ where: { serviceType: 'INTERNET', month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'WATER', month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'RENT', month, year } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'INTERNET', month, year } } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'WATER', month, year } } }),
    prisma.variableCost.findMany({ where: { month, year }, orderBy: { label: 'asc' } }),
  ])

  // Cash actually collected, including partial payments on bills that aren't fully paid yet —
  // not just the total of bills marked isPaid.
  const internetCollected = internetBills.reduce((s, b) => s + Number(b.amountPaid), 0)
  const waterCollected = waterBills.reduce((s, b) => s + Number(b.amountPaid), 0)
  const rentCollected = rentBills.reduce((s, b) => s + Number(b.amountPaid), 0)
  const internetProviderCost = internetCost ? Number(internetCost.amount) : 0
  const waterProviderCost = waterCost ? Number(waterCost.amount) : 0
  const internetProfit = internetCollected - internetProviderCost
  const waterProfit = waterCollected - waterProviderCost

  const variableCosts = variableCostRows.map(v => ({ id: v.id, label: v.label, amount: Number(v.amount), notes: v.notes }))
  const totalVariableCosts = variableCosts.reduce((s, v) => s + v.amount, 0)

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
    netProfit: internetProfit + waterProfit + rentCollected - totalVariableCosts,
    variableCosts,
    totalVariableCosts,
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

interface VariableCostInput {
  label: string
  month: number
  year: number
  amount: number
  notes?: string
}

export async function saveVariableCost(input: VariableCostInput): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }
  if (!input.label.trim()) return { success: false, error: 'Label is required.' }

  const label = input.label.trim()

  await prisma.variableCost.upsert({
    where: { label_month_year: { label, month: input.month, year: input.year } },
    update: { amount: input.amount, notes: input.notes },
    create: { ...input, label },
  })

  revalidatePath('/dashboard/reports')
  return { success: true, data: undefined }
}

export async function deleteVariableCost(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }

  await prisma.variableCost.delete({ where: { id } })

  revalidatePath('/dashboard/reports')
  return { success: true, data: undefined }
}

export interface ClientArrearsRow {
  clientId: string
  clientName: string
  clientUnit: string | null
  clientPhone: string
  internetOwed: number
  waterOwed: number
  rentOwed: number
  totalOwed: number
  unpaidBillCount: number
  oldestUnpaidLabel: string | null
}

export async function getArrears(): Promise<ClientArrearsRow[] | { error: string }> {
  const session = await auth()
  if (!requireAdmin(session)) return { error: 'Forbidden' }

  const bills = await prisma.bill.findMany({
    where: { isPaid: false },
    include: { client: { select: { name: true, unit: true, phone: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })

  const byClient = new Map<string, ClientArrearsRow>()
  for (const b of bills) {
    const owed = Number(b.amount) - Number(b.amountPaid)
    if (owed <= 0) continue

    let row = byClient.get(b.clientId)
    if (!row) {
      row = {
        clientId: b.clientId,
        clientName: b.client.name,
        clientUnit: b.client.unit,
        clientPhone: b.client.phone,
        internetOwed: 0,
        waterOwed: 0,
        rentOwed: 0,
        totalOwed: 0,
        unpaidBillCount: 0,
        oldestUnpaidLabel: null,
      }
      byClient.set(b.clientId, row)
    }

    if (b.serviceType === 'INTERNET') row.internetOwed += owed
    if (b.serviceType === 'WATER') row.waterOwed += owed
    if (b.serviceType === 'RENT') row.rentOwed += owed
    row.totalOwed += owed
    row.unpaidBillCount += 1
    if (!row.oldestUnpaidLabel) {
      row.oldestUnpaidLabel = `${monthName(b.month)} ${b.year}`
    }
  }

  return Array.from(byClient.values()).sort((a, b) => b.totalOwed - a.totalOwed)
}
