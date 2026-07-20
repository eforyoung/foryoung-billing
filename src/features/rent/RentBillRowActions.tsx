'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, Button, Input } from '@/lib/ui'
import { updateRentBill } from './actions'
import { computeRentTotal } from '@/features/billing/calculations'
import { fmtXaf } from '@/lib/utils'

interface RentBillRowActionsProps {
  bill: { id: string; month: number; year: number; amount: number; monthsCount: number; dueDate: string | null }
}

export function RentBillRowActions({ bill }: RentBillRowActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(bill.month)
  const [year, setYear] = useState(bill.year)
  const [amount, setAmount] = useState(bill.monthsCount > 0 ? bill.amount / bill.monthsCount : bill.amount)
  const [monthsCount, setMonthsCount] = useState(bill.monthsCount)
  const [dueDate, setDueDate] = useState(bill.dueDate ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateRentBill(bill.id, { month, year, amount, monthsCount, dueDate })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button className="text-teal hover:underline" onClick={() => setOpen(true)}>
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Rent Bill">
        <div className="space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
            <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div className="flex gap-3">
            <Input label="Amount per month" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            <Input label="Number of months" type="number" min={1} value={monthsCount} onChange={e => setMonthsCount(Number(e.target.value))} />
          </div>
          <Input label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <p className="text-sm text-white/70">
            Total: <span className="font-semibold text-white">{fmtXaf(computeRentTotal(amount, monthsCount))}</span> (
            {monthsCount} month{monthsCount > 1 ? 's' : ''})
          </p>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
