'use client'

import { useEffect, useState } from 'react'
import { Card, Button } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getPayments } from './actions'
import { generateReceiptPDF } from '@/features/receipts/ReceiptPDF'
import type { ServiceType } from '@prisma/client'

interface PaymentRow {
  id: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  month: number
  year: number
  amount: number
  client: { name: string; phone: string }
  payment: { amountPaid: number; paymentDate: Date | string; notes: string | null } | null
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
    if (!row.payment) return
    generateReceiptPDF({
      receiptNumber: `${row.id.slice(0, 8).toUpperCase()}`,
      clientName: row.client.name,
      clientPhone: row.client.phone,
      serviceType: row.serviceType,
      periodLabel: `${monthName(row.month)} ${row.year}`,
      amount: row.payment.amountPaid,
      paidDate: new Date(row.payment.paymentDate).toISOString().slice(0, 10),
      notes: row.payment.notes ?? undefined,
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
        <thead className="text-slate-500">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Service</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Paid Date</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-2 text-slate-900">{r.client.name}</td>
              <td className="py-2 text-slate-600">{r.serviceType}</td>
              <td className="py-2 text-slate-600">
                {monthName(r.month)} {r.year}
              </td>
              <td className="py-2 text-slate-600">{fmtXaf(r.amount)}</td>
              <td className="py-2 text-slate-600">
                {r.payment ? new Date(r.payment.paymentDate).toISOString().slice(0, 10) : '—'}
              </td>
              <td className="py-2">
                <Button size="sm" onClick={() => handleDownload(r)} disabled={!r.payment}>
                  Download Receipt
                </Button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-center text-slate-400">
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
