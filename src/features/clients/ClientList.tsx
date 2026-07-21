'use client'

import { useState } from 'react'
import { Card, Button, Badge } from '@/lib/ui'
import { toggleClientActive } from './actions'
import { ClientForm } from './ClientForm'
import type { ClientWithServices } from './types'

export function ClientList({ clients }: { clients: ClientWithServices[] }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientWithServices | null>(null)

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(client: ClientWithServices) {
    setEditing(client)
    setFormOpen(true)
  }

  return (
    <Card title="Clients">
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>+ Add Client</Button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Name</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Phone</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Unit</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Services</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Status</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-900">{c.name}</td>
              <td className="px-3 py-2 text-slate-600">{c.phone}</td>
              <td className="px-3 py-2 text-slate-600">{c.unit || '—'}</td>
              <td className="px-3 py-2 text-slate-600">{c.services.map(s => s.type).join(', ') || '—'}</td>
              <td className="px-3 py-2">
                <Badge color={c.isActive ? 'green' : 'grey'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="px-3 py-2 space-x-2">
                <button className="text-navy hover:underline" onClick={() => openEdit(c)}>
                  Edit
                </button>
                <button className="text-slate-500 hover:underline" onClick={() => toggleClientActive(c.id)}>
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <ClientForm
        key={`${formOpen}-${editing?.id ?? 'new'}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
    </Card>
  )
}
