'use client'

import { useState } from 'react'
import { Card, Button, Badge, Modal, Input } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getUnpaidBills, recordPayment } from './actions'
import { generateReceiptPDF } from '@/features/receipts/ReceiptPDF'

interface UnpaidBill {
  id: string
  clientId: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  month: number
  year: number
  monthsCount: number
  amount: number
  amountPaid: number
  dueDate: string | null
  client: { name: string; phone: string; unit: string | null }
  reading: { consumption: number; consumptionCost: number } | null
}

export function PaymentList({ unpaidBills, platformId }: { unpaidBills: UnpaidBill[]; platformId: string }) {
  const [bills, setBills] = useState<UnpaidBill[]>(unpaidBills)
  const [payingBill, setPayingBill] = useState<UnpaidBill | null>(null)
  const [amount, setAmount] = useState(0)
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  async function refresh() {
    const data = await getUnpaidBills(platformId)
    setBills(
      data.map(b => ({
        id: b.id,
        clientId: b.clientId,
        serviceType: b.serviceType,
        month: b.month,
        year: b.year,
        monthsCount: b.monthsCount,
        amount: b.amount,
        amountPaid: b.amountPaid,
        dueDate: b.dueDate ? new Date(b.dueDate).toISOString().slice(0, 10) : null,
        client: b.client,
        reading: b.reading,
      })),
    )
  }

  function openPayModal(bill: UnpaidBill) {
    setModalError('')
    setNotes('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setAmount(bill.amount - bill.amountPaid)
    setPayingBill(bill)
  }

  function closePayModal() {
    if (saving) return
    setPayingBill(null)
  }

  async function handleConfirmPayment() {
    if (!payingBill) return
    if (!paymentDate) {
      setModalError('Please select a payment date.')
      return
    }
    const remaining = payingBill.amount - payingBill.amountPaid
    if (!(amount > 0)) {
      setModalError('Payment amount must be greater than zero.')
      return
    }
    if (amount > remaining) {
      setModalError(`Amount exceeds the remaining balance of ${fmtXaf(remaining)}.`)
      return
    }
    setModalError('')
    setSaving(true)
    try {
      const result = await recordPayment(payingBill.id, amount, paymentDate, notes || undefined)
      if (!result.success) {
        setModalError(result.error)
        return
      }
      const balanceRemaining = remaining - amount
      generateReceiptPDF({
        id: payingBill.id,
        serviceType: payingBill.serviceType,
        month: payingBill.month,
        year: payingBill.year,
        monthsCount: payingBill.monthsCount,
        billTotal: payingBill.amount,
        amountPaidNow: amount,
        balanceRemaining,
        paidDate: paymentDate,
        notes: notes || null,
        dueDate: payingBill.dueDate,
        client: payingBill.client,
        reading: payingBill.reading,
      })
      setPayingBill(null)
      refresh()
    } catch {
      setModalError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="Unpaid Bills">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Service</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Period</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Bill Total</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Balance Due</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Status</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-900">{b.client.name}</td>
              <td className="px-3 py-2">
                <Badge color="blue">{b.serviceType}</Badge>
              </td>
              <td className="px-3 py-2 text-slate-600">
                {monthName(b.month)} {b.year}
              </td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(b.amount)}</td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(b.amount - b.amountPaid)}</td>
              <td className="px-3 py-2">
                <Badge color={b.amountPaid > 0 ? 'blue' : 'amber'}>{b.amountPaid > 0 ? 'Partial' : 'Unpaid'}</Badge>
              </td>
              <td className="px-3 py-2">
                <Button size="sm" onClick={() => openPayModal(b)}>
                  Record Payment
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-center text-slate-400">
                No unpaid bills.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Modal open={!!payingBill} onClose={closePayModal} title="Record Payment">
        <div className="space-y-3">
          {payingBill && (
            <p className="text-sm text-slate-600">
              {payingBill.client.name} — {monthName(payingBill.month)} {payingBill.year}
              <br />
              Bill Total: <span className="font-semibold text-slate-900">{fmtXaf(payingBill.amount)}</span> · Already
              Paid: <span className="font-semibold text-slate-900">{fmtXaf(payingBill.amountPaid)}</span> · Balance
              Due:{' '}
              <span className="font-semibold text-slate-900">
                {fmtXaf(payingBill.amount - payingBill.amountPaid)}
              </span>
            </p>
          )}
          {modalError && <p className="text-sm text-red-600">{modalError}</p>}
          <Input
            label="Amount received"
            type="number"
            min={0}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
          />
          <Input
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
          />
          <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2 pt-2">
            <Button onClick={handleConfirmPayment} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm Payment'}
            </Button>
            <Button type="button" variant="ghost" onClick={closePayModal} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}
