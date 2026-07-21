'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, Button, Input } from '@/lib/ui'
import { updateWaterBill, previewWaterBill } from './actions'
import { fmtXaf } from '@/lib/utils'
import type { WaterBillBreakdown } from '@/features/billing/calculations'

interface WaterBillRowActionsProps {
  bill: { id: string; month: number; year: number; previousReading: number; currentReading: number }
}

export function WaterBillRowActions({ bill }: WaterBillRowActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(bill.month)
  const [year, setYear] = useState(bill.year)
  const [previousReading, setPreviousReading] = useState(bill.previousReading)
  const [currentReading, setCurrentReading] = useState(bill.currentReading)
  const [breakdown, setBreakdown] = useState<WaterBillBreakdown | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    previewWaterBill(currentReading, previousReading).then(result => {
      setBreakdown(result.success ? result.data : null)
    })
  }, [open, currentReading, previousReading])

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateWaterBill(bill.id, { month, year, currentReading, previousReading })
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
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Water Bill">
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
            <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <Input
            label="Previous reading"
            type="number"
            value={previousReading}
            onChange={e => setPreviousReading(Number(e.target.value))}
          />
          <Input
            label="Current reading"
            type="number"
            value={currentReading}
            onChange={e => setCurrentReading(Number(e.target.value))}
          />
          {breakdown && (
            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>New total</span>
                <span className="font-semibold text-slate-900">{fmtXaf(breakdown.total)}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !breakdown}>
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
