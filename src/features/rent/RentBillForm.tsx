'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { generateRentBill } from './actions'

export function RentBillForm() {
  const [clients, setClients] = useState<{ id: string; name: string; unit: string | null }[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('RENT').then(result => {
      setClients(result)
      setClientsLoading(false)
    }).catch(() => setClientsLoading(false))
  }, [])

  async function handleGenerate() {
    setMessage('')
    const result = await generateRentBill({ clientId, month, year })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Generate Rent Bill">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-white/70">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            disabled={clientsLoading}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
          >
            <option value="">{clientsLoading ? 'Loading clients…' : 'Select client…'}</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.unit ? ` — ${c.unit}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>
        {message && <p className="text-sm text-teal">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
