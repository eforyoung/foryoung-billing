'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getPayments } from './actions'
import { generateReceiptPDF } from '@/features/receipts/ReceiptPDF'
import type { ServiceType } from '@prisma/client'

interface PaymentRow {
  id: string
  amountPaid: number
  paymentDate: Date | string
  notes: string | null
  balanceAfter: number
  bill: {
    id: string
    serviceType: 'INTERNET' | 'WATER' | 'RENT'
    month: number
    year: number
    monthsCount: number
    amount: number
    dueDate: Date | string | null
    client: { name: string; phone: string; unit: string | null }
    reading: { consumption: number; consumptionCost: number } | null
  }
}

export function PaymentHistory() {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    const data = await getPayments({
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      serviceType: serviceType ? (serviceType as ServiceType) : undefined,
    })
    setRows(data as PaymentRow[])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDownload(row: PaymentRow) {
    generateReceiptPDF({
      id: row.bill.id,
      serviceType: row.bill.serviceType,
      month: row.bill.month,
      year: row.bill.year,
      monthsCount: row.bill.monthsCount,
      billTotal: row.bill.amount,
      amountPaidNow: row.amountPaid,
      balanceRemaining: row.balanceAfter,
      paidDate: new Date(row.paymentDate).toISOString().slice(0, 10),
      notes: row.notes,
      dueDate: row.bill.dueDate ? new Date(row.bill.dueDate).toISOString().slice(0, 10) : null,
      client: row.bill.client,
      reading: row.bill.reading,
    })
  }

  return (
    <Card title="Payment History">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Month</label>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-24 rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Year</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(e.target.value)}
            className="w-28 rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">Service</label>
          <select
            value={serviceType}
            onChange={e => setServiceType(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="" className="bg-white text-slate-900">All</option>
            <option value="INTERNET" className="bg-white text-slate-900">INTERNET</option>
            <option value="WATER" className="bg-white text-slate-900">WATER</option>
            <option value="RENT" className="bg-white text-slate-900">RENT</option>
          </select>
        </div>
        <Button onClick={refresh} disabled={loading}>
          Filter
        </Button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Service</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Period</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Amount Paid</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Balance After</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Paid Date</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-900">{r.bill.client.name}</td>
              <td className="px-3 py-2 text-slate-600">{r.bill.serviceType}</td>
              <td className="px-3 py-2 text-slate-600">
                {monthName(r.bill.month)} {r.bill.year}
              </td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(r.amountPaid)}</td>
              <td className="px-3 py-2 text-slate-600">
                {r.balanceAfter > 0 ? (
                  <Badge color="blue">{fmtXaf(r.balanceAfter)}</Badge>
                ) : (
                  <Badge color="green">Paid in Full</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-slate-600">{new Date(r.paymentDate).toISOString().slice(0, 10)}</td>
              <td className="px-3 py-2">
                <Button size="sm" onClick={() => handleDownload(r)}>
                  Download Receipt
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-center text-slate-400">
                {loading ? 'Loading…' : 'No payments found.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </Card>
  )
}
