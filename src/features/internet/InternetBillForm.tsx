'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { checkInternetArrears, generateInternetBill } from './actions'
import { computeInternetTotal } from '@/features/billing/calculations'
import { fmtXaf, monthName } from '@/lib/utils'
import type { ArrearsSummary } from '@/features/billing/calculations'

export function InternetBillForm() {
  const [clients, setClients] = useState<{ id: string; name: string; unit: string | null }[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [arrears, setArrears] = useState<ArrearsSummary | null>(null)
  const [consolidate, setConsolidate] = useState(false)
  const [manualMonths, setManualMonths] = useState(1)
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().slice(0, 10)
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('INTERNET').then(result => {
      setClients(result)
      setClientsLoading(false)
    }).catch(() => setClientsLoading(false))
  }, [])

  useEffect(() => {
    if (!clientId) {
      setArrears(null)
      return
    }
    checkInternetArrears(clientId, month, year).then(a => setArrears(a.bills.length > 0 ? a : null))
  }, [clientId, month, year])

  const monthsCount = consolidate && arrears ? arrears.totalMonths + 1 : manualMonths
  const total = computeInternetTotal(monthsCount)

  async function handleGenerate() {
    setMessage('')
    const result = await generateInternetBill({ clientId, month, year, monthsCount, consolidate, dueDate })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Generate Internet Bill">
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
          <Input
            label="Number of months"
            type="number"
            min={1}
            value={monthsCount}
            disabled={consolidate && !!arrears}
            onChange={e => setManualMonths(Number(e.target.value))}
          />
          <Input label="Due date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>

        {arrears && (
          <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            {arrears.totalMonths} unpaid month{arrears.totalMonths > 1 ? 's' : ''} (
            {arrears.bills.map(b => `${monthName(b.month)} ${b.year}`).join(', ')}) totaling {fmtXaf(arrears.totalAmount)}.
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={consolidate} onChange={e => setConsolidate(e.target.checked)} />
              Consolidate into this bill (sets months automatically)
            </label>
          </div>
        )}

        <p className="text-sm text-slate-600">
          Total: <span className="font-semibold text-slate-900">{fmtXaf(total)}</span> ({monthsCount} month
          {monthsCount > 1 ? 's' : ''})
        </p>

        {message && <p className="text-sm text-slate-600">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
