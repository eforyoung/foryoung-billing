'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'

export interface DashboardSummary {
  totalClients: number
  activeClients: number
  unpaidBillsCount: number
  revenueThisMonth: number
  totalArrears: number
  recentUnpaid: { id: string; clientName: string; serviceType: string; balanceDue: number; month: number; year: number }[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const session = await auth()
  if (!session?.user) {
    return { totalClients: 0, activeClients: 0, unpaidBillsCount: 0, revenueThisMonth: 0, totalArrears: 0, recentUnpaid: [] }
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [totalClients, activeClients, unpaidBills, billsThisPeriod, recentUnpaidBills] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.bill.findMany({ where: { isPaid: false }, select: { amount: true, amountPaid: true } }),
    prisma.bill.findMany({ where: { month, year }, select: { amountPaid: true } }),
    prisma.bill.findMany({
      where: { isPaid: false },
      include: { client: { select: { name: true } } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      take: 10,
    }),
  ])

  return {
    totalClients,
    activeClients,
    unpaidBillsCount: unpaidBills.length,
    revenueThisMonth: billsThisPeriod.reduce((s, b) => s + Number(b.amountPaid), 0),
    totalArrears: unpaidBills.reduce((s, b) => s + (Number(b.amount) - Number(b.amountPaid)), 0),
    recentUnpaid: recentUnpaidBills.map(b => ({
      id: b.id,
      clientName: b.client.name,
      serviceType: b.serviceType,
      balanceDue: Number(b.amount) - Number(b.amountPaid),
      month: b.month,
      year: b.year,
    })),
  }
}
