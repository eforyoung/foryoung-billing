'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Modal, Input } from '@/lib/ui'
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
  const [payingBill, setPayingBill] = useState<UnpaidBill | null>(null)
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

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

  function openPayModal(bill: UnpaidBill) {
    setModalError('')
    setNotes('')
    setPaymentDate(new Date().toISOString().slice(0, 10))
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
    setModalError('')
    setSaving(true)
    try {
      const result = await markBillPaid(payingBill.id, paymentDate, notes || undefined)
      if (!result.success) {
        setModalError(result.error)
        return
      }
      generateReceiptPDF({
        id: payingBill.id,
        serviceType: payingBill.serviceType,
        month: payingBill.month,
        year: payingBill.year,
        monthsCount: payingBill.monthsCount,
        amount: payingBill.amount,
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
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Amount</th>
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
              <td className="px-3 py-2">
                <Button size="sm" onClick={() => openPayModal(b)}>
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

      <Modal open={!!payingBill} onClose={closePayModal} title="Confirm Payment">
        <div className="space-y-3">
          {payingBill && (
            <p className="text-sm text-slate-600">
              {payingBill.client.name} — {monthName(payingBill.month)} {payingBill.year} —{' '}
              <span className="font-semibold text-slate-900">{fmtXaf(payingBill.amount)}</span>
            </p>
          )}
          {modalError && <p className="text-sm text-red-600">{modalError}</p>}
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
