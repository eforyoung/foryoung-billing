'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { getPreviousReading, previewWaterBill, generateWaterBill } from './actions'
import { fmtXaf } from '@/lib/utils'
import type { WaterBillBreakdown } from '@/features/billing/calculations'

export function WaterReadingForm() {
  const [clients, setClients] = useState<{ id: string; name: string; unit: string | null }[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [previousReading, setPreviousReading] = useState<number | null>(null)
  const [manualPrevious, setManualPrevious] = useState(0)
  const [currentReading, setCurrentReading] = useState(0)
  const [breakdown, setBreakdown] = useState<WaterBillBreakdown | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('WATER').then(result => {
      setClients(result)
      setClientsLoading(false)
    }).catch(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (!clientId) {
      setPreviousReading(null)
      return
    }
    getPreviousReading(clientId).then(setPreviousReading)
  }, [clientId])

  const effectivePrevious = previousReading ?? manualPrevious

  useEffect(() => {
    if (!clientId || currentReading <= 0) {
      setBreakdown(null)
      return
    }
    previewWaterBill(currentReading, effectivePrevious).then(result => {
      setBreakdown(result.success ? result.data : null)
    })
  }, [clientId, currentReading, effectivePrevious])

  async function handleGenerate() {
    setMessage('')
    const result = await generateWaterBill({
      clientId,
      month,
      year,
      currentReading,
      previousReading: effectivePrevious,
    })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Enter Water Meter Reading">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            disabled={clientsLoading}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900"
          >
            <option value="" className="bg-white text-slate-900">{clientsLoading ? 'Loading clients…' : 'Select client…'}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-white text-slate-900">
                {c.name}{c.unit ? ` — ${c.unit}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {clientId && previousReading === null && (
          <Input
            label="Previous reading (no prior reading on file — enter manually)"
            type="number"
            value={manualPrevious}
            onChange={e => setManualPrevious(Number(e.target.value))}
          />
        )}
        {clientId && previousReading !== null && (
          <p className="text-sm text-slate-600">Previous reading: {previousReading.toFixed(1)} m³</p>
        )}

        <Input
          label="Current reading"
          type="number"
          value={currentReading}
          onChange={e => setCurrentReading(Number(e.target.value))}
        />

        {breakdown && (
          <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Consumption</span>
              <span>{breakdown.consumption} m³</span>
            </div>
            {breakdown.consumption === 0 ? (
              <div className="flex justify-between">
                <span>Default tax share (930 split across active water tenants)</span>
                <span>{fmtXaf(breakdown.defaultTaxShare)}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Consumption cost (@ 700 F/m³)</span>
                <span>{fmtXaf(breakdown.consumptionCost)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Electricity fee</span>
              <span>{fmtXaf(breakdown.electricityFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pump service fee</span>
              <span>{fmtXaf(breakdown.pumpServiceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold text-slate-900">
              <span>Total</span>
              <span>{fmtXaf(breakdown.total)}</span>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId || !breakdown}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
