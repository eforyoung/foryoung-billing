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
  amount: unknown
  client: { name: string }
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
        amount: b.amount,
        client: b.client,
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
      receiptNumber: `${bill.id.slice(0, 8).toUpperCase()}`,
      clientName: bill.client.name,
      clientPhone: '',
      serviceType: bill.serviceType,
      periodLabel: `${monthName(bill.month)} ${bill.year}`,
      amount: Number(bill.amount),
      paidDate: today,
    })
    refresh()
  }

  return (
    <Card title="Unpaid Bills">
      {message && <p className="mb-2 text-sm text-red-400">{message}</p>}
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
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
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2">
                <Badge color="blue">{b.serviceType}</Badge>
              </td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Button size="sm" onClick={() => handleMarkPaid(b)}>
                  Mark Paid + Receipt
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-white/40">
                No unpaid bills.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
