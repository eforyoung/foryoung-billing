'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getUnpaidBills, markBillPaid } from './actions'
import { generateReceiptPDF } from '@/features/receipts/ReceiptPDF'

interface UnpaidBill {
  id: string
  clientId: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  month: number
  year: number
  monthsCount: number
  amount: number
  dueDate: string | null
  client: { name: string; phone: string; unit: string | null }
  reading: { consumption: number; consumptionCost: number } | null
}

export function PaymentList() {
  const [bills, setBills] = useState<UnpaidBill[]>([])
  const [message, setMessage] = useState('')

  async function refresh() {
    const data = await getUnpaidBills()
    setBills(
      data.map(b => ({
        id: b.id,
        clientId: b.clientId,
        serviceType: b.serviceType,
        month: b.month,
        year: b.year,
        monthsCount: b.monthsCount,
        amount: b.amount,
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString().slice(0, 10) : null,
        client: b.client,
        reading: b.reading,
      })),
    )
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleMarkPaid(bill: UnpaidBill) {
    setMessage('')
    const today = new Date().toISOString().slice(0, 10)
    const result = await markBillPaid(bill.id, today)
    if (!result.success) {
      setMessage(result.error)
      return
    }
    generateReceiptPDF({
      id: bill.id,
      serviceType: bill.serviceType,
      month: bill.month,
      year: bill.year,
      monthsCount: bill.monthsCount,
      amount: bill.amount,
      paidDate: today,
      notes: null,
      dueDate: bill.dueDate,
      client: bill.client,
      reading: bill.reading,
    })
    refresh()
  }

  return (
    <Card title="Unpaid Bills">
      {message && <p className="mb-2 text-sm text-red-600">{message}</p>}
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Service</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="py-2 text-slate-900">{b.client.name}</td>
              <td className="py-2">
                <Badge color="blue">{b.serviceType}</Badge>
              </td>
              <td className="py-2 text-slate-600">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-slate-600">{fmtXaf(b.amount)}</td>
              <td className="py-2">
                <Button size="sm" onClick={() => handleMarkPaid(b)}>
                  Mark Paid + Receipt
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-400">
                No unpaid bills.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </Card>
  )
}
