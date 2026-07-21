'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, Button, Input } from '@/lib/ui'
import { updateInternetBill } from './actions'
import { computeInternetTotal } from '@/features/billing/calculations'
import { fmtXaf } from '@/lib/utils'

interface InternetBillRowActionsProps {
  bill: { id: string; month: number; year: number; monthsCount: number; dueDate: string | null }
}

export function InternetBillRowActions({ bill }: InternetBillRowActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(bill.month)
  const [year, setYear] = useState(bill.year)
  const [monthsCount, setMonthsCount] = useState(bill.monthsCount)
  const [dueDate, setDueDate] = useState(bill.dueDate ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateInternetBill(bill.id, { month, year, monthsCount, dueDate })
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
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Internet Bill">
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
            <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <Input
            label="Months covered"
            type="number"
            min={1}
            value={monthsCount}
            onChange={e => setMonthsCount(Number(e.target.value))}
          />
          <Input label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <p className="text-sm text-slate-600">
            New total: <span className="font-semibold text-slate-900">{fmtXaf(computeInternetTotal(monthsCount))}</span>
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
