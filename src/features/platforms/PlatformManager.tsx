'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Badge } from '@/lib/ui'
import { createPlatform, renamePlatform, assignUserPlatform } from './actions'
import type { PlatformWithStats, UserRow } from './actions'

interface PlatformManagerProps {
  platforms: PlatformWithStats[]
  users: UserRow[]
  currentPlatformSlug: string
}

export function PlatformManager({ platforms: initialPlatforms, users: initialUsers, currentPlatformSlug }: PlatformManagerProps) {
  const router = useRouter()
  const [platforms, setPlatforms] = useState(initialPlatforms)
  const [users, setUsers] = useState(initialUsers)

  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renaming, setRenaming] = useState(false)

  const [assignError, setAssignError] = useState('')

  async function handleCreate() {
    setCreateError('')
    if (!newName.trim()) { setCreateError('Name is required'); return }
    setCreating(true)
    const result = await createPlatform(newName)
    setCreating(false)
    if (!result.success) { setCreateError(result.error); return }
    setNewName('')
    router.refresh()
  }

  function startRename(p: PlatformWithStats) {
    setRenamingId(p.id)
    setRenameValue(p.name)
    setRenameError('')
  }

  async function handleRename() {
    if (!renamingId) return
    setRenameError('')
    if (!renameValue.trim()) { setRenameError('Name is required'); return }
    setRenaming(true)
    const result = await renamePlatform(renamingId, renameValue)
    setRenaming(false)
    if (!result.success) { setRenameError(result.error ?? 'Failed'); return }
    setRenamingId(null)
    router.refresh()
  }

  async function handleAssign(userId: string, platformId: string) {
    setAssignError('')
    const result = await assignUserPlatform(userId, platformId || null)
    if (!result.success) { setAssignError(result.error ?? 'Failed'); return }
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <Card title="Platforms">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-navy">
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Name</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Slug</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Clients</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Users</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map(p => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">
                    {renamingId === p.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 text-sm"
                          onKeyDown={e => { if (e.key === 'Enter') handleRename() }}
                          autoFocus
                        />
                        <Button size="sm" onClick={handleRename} disabled={renaming}>
                          {renaming ? '…' : 'Save'}
                        </Button>
                        <button className="text-slate-400 hover:text-slate-600 text-sm" onClick={() => setRenamingId(null)}>
                          Cancel
                        </button>
                        {renameError && <span className="text-xs text-red-600">{renameError}</span>}
                      </div>
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-mono text-xs">{p.slug}</td>
                  <td className="px-3 py-2 text-slate-600">{p.clientCount}</td>
                  <td className="px-3 py-2 text-slate-600">{p.userCount}</td>
                  <td className="px-3 py-2">
                    {renamingId !== p.id && (
                      <button className="text-navy hover:underline text-sm" onClick={() => startRename(p)}>
                        Rename
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Create new platform</p>
          <div className="flex items-end gap-3">
            <Input
              label="Platform name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleCreate() }}
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>
          {createError && <p className="mt-1 text-sm text-red-600">{createError}</p>}
        </div>
      </Card>

      <Card title="User Platform Assignments">
        <p className="mb-3 text-sm text-slate-600">
          Admins have access to all platforms. Assign each caretaker to their platform.
        </p>
        {assignError && <p className="mb-2 text-sm text-red-600">{assignError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-navy">
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Name</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Email</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Role</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white">Platform</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{u.name}</td>
                  <td className="px-3 py-2 text-slate-600">{u.email}</td>
                  <td className="px-3 py-2">
                    <Badge color={u.role === 'ADMIN' ? 'blue' : 'grey'}>{u.role}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    {u.role === 'ADMIN' ? (
                      <span className="text-slate-400 text-sm italic">All platforms</span>
                    ) : (
                      <select
                        value={u.platformId ?? ''}
                        onChange={e => handleAssign(u.id, e.target.value)}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-900 text-sm"
                      >
                        <option value="" className="bg-white text-slate-900">— Not assigned —</option>
                        {platforms.map(p => (
                          <option key={p.id} value={p.id} className="bg-white text-slate-900">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
