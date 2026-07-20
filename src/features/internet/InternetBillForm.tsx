'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { checkInternetArrears, generateInternetBill } from './actions'
import { computeInternetTotal } from '@/features/billing/calculations'
import { fmtXaf, monthName } from '@/lib/utils'
import type { ArrearsSummary } from '@/features/billing/calculations'

export function InternetBillForm() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [arrears, setArrears] = useState<ArrearsSummary | null>(null)
  const [consolidate, setConsolidate] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('INTERNET').then(setClients)
  }, [])

  useEffect(() => {
    if (!clientId) {
      setArrears(null)
      return
    }
    checkInternetArrears(clientId, month, year).then(a => setArrears(a.bills.length > 0 ? a : null))
  }, [clientId, month, year])

  const monthsCount = consolidate && arrears ? arrears.totalMonths + 1 : 1
  const total = computeInternetTotal(monthsCount)

  async function handleGenerate() {
    setMessage('')
    const result = await generateInternetBill({ clientId, month, year, monthsCount })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Generate Internet Bill">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-white/70">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {arrears && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            {arrears.totalMonths} unpaid month{arrears.totalMonths > 1 ? 's' : ''} (
            {arrears.bills.map(b => `${monthName(b.month)} ${b.year}`).join(', ')}) totaling {fmtXaf(arrears.totalAmount)}.
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={consolidate} onChange={e => setConsolidate(e.target.checked)} />
              Consolidate into this bill
            </label>
          </div>
        )}

        <p className="text-sm text-white/70">
          Total: <span className="font-semibold text-white">{fmtXaf(total)}</span> ({monthsCount} month
          {monthsCount > 1 ? 's' : ''})
        </p>

        {message && <p className="text-sm text-teal">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
