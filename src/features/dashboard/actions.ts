'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'

export interface DashboardSummary {
  totalClients: number
  activeClients: number
  unpaidBillsCount: number
  revenueThisMonth: number
  recentUnpaid: { id: string; clientName: string; serviceType: string; amount: number; month: number; year: number }[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const session = await auth()
  if (!session?.user) return { totalClients: 0, activeClients: 0, unpaidBillsCount: 0, revenueThisMonth: 0, recentUnpaid: [] }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [totalClients, activeClients, unpaidBillsCount, paidThisMonth, recentUnpaidBills] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.bill.count({ where: { isPaid: false } }),
    prisma.bill.findMany({ where: { isPaid: true, month, year }, select: { amount: true } }),
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
    unpaidBillsCount,
    revenueThisMonth: paidThisMonth.reduce((s, b) => s + Number(b.amount), 0),
    recentUnpaid: recentUnpaidBills.map(b => ({
      id: b.id,
      clientName: b.client.name,
      serviceType: b.serviceType,
      amount: Number(b.amount),
      month: b.month,
      year: b.year,
    })),
  }
}
