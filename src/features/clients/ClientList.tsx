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
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Phone</th>
            <th className="pb-2">Unit</th>
            <th className="pb-2">Services</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-t border-white/10">
              <td className="py-2 text-white">{c.name}</td>
              <td className="py-2 text-white/70">{c.phone}</td>
              <td className="py-2 text-white/70">{c.unit || '—'}</td>
              <td className="py-2 text-white/70">{c.services.map(s => s.type).join(', ') || '—'}</td>
              <td className="py-2">
                <Badge color={c.isActive ? 'green' : 'grey'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="py-2 space-x-2">
                <button className="text-teal hover:underline" onClick={() => openEdit(c)}>
                  Edit
                </button>
                <button className="text-white/50 hover:underline" onClick={() => toggleClientActive(c.id)}>
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </Card>
  )
}
