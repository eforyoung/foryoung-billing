'use client'

import { useState } from 'react'
import { SlideOver, Button, Input } from '@/lib/ui'
import { saveClient } from './actions'
import type { ClientWithServices } from './types'
import type { ServiceType } from '@prisma/client'

interface ClientFormProps {
  open: boolean
  onClose: () => void
  editing: ClientWithServices | null
}

export function ClientForm({ open, onClose, editing }: ClientFormProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [unit, setUnit] = useState(editing?.unit ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [isActive, setIsActive] = useState(editing?.isActive ?? true)
  const [hasInternet, setHasInternet] = useState(!!editing?.services.find(s => s.type === 'INTERNET'))
  const [hasWater, setHasWater] = useState(!!editing?.services.find(s => s.type === 'WATER'))
  const [hasRent, setHasRent] = useState(!!editing?.services.find(s => s.type === 'RENT'))
  const [rentAmount, setRentAmount] = useState(editing?.services.find(s => s.type === 'RENT')?.rate ?? 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const services: { type: ServiceType; rate?: number }[] = []
    if (hasInternet) services.push({ type: 'INTERNET', rate: 10000 })
    if (hasWater) services.push({ type: 'WATER' })
    if (hasRent) services.push({ type: 'RENT', rate: rentAmount })

    const result = await saveClient({
      id: editing?.id,
      name,
      phone,
      email,
      unit,
      notes,
      isActive,
      services,
    })

    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <SlideOver open={open} onClose={onClose} title={editing ? 'Edit Client' : 'Add Client'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Unit / Apartment" value={unit} onChange={e => setUnit(e.target.value)} />

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={hasInternet} onChange={e => setHasInternet(e.target.checked)} />
            Internet (10,000 XAF/month)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={hasWater} onChange={e => setHasWater(e.target.checked)} />
            Water
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={hasRent} onChange={e => setHasRent(e.target.checked)} />
            Rent
          </label>
          {hasRent && (
            <Input
              label="Rent amount (XAF/month)"
              type="number"
              value={rentAmount}
              onChange={e => setRentAmount(Number(e.target.value))}
            />
          )}
        </div>

        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </SlideOver>
  )
}
