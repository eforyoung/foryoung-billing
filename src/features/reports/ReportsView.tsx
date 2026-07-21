'use client'

import { useEffect, useState } from 'react'
import { Card, Input, Button } from '@/lib/ui'
import { fmtXaf } from '@/lib/utils'
import { getReport, saveProviderCost, saveVariableCost, deleteVariableCost, type ReportData } from './actions'

export function ReportsView() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [internetCost, setInternetCost] = useState(0)
  const [waterCost, setWaterCost] = useState(0)
  const [tab, setTab] = useState<'pnl' | 'variable'>('pnl')
  const [newLabel, setNewLabel] = useState('House Repairs')
  const [newAmount, setNewAmount] = useState(0)
  const [newNotes, setNewNotes] = useState('')

  async function refresh() {
    const result = await getReport(month, year)
    if ('error' in result) return
    setReport(result)
    setInternetCost(result.internetProviderCost)
    setWaterCost(result.waterProviderCost)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  async function handleSaveCosts() {
    await saveProviderCost({ serviceType: 'INTERNET', month, year, amount: internetCost })
    await saveProviderCost({ serviceType: 'WATER', month, year, amount: waterCost })
    refresh()
  }

  async function handleAddVariableCost() {
    if (!newLabel.trim()) return
    await saveVariableCost({ label: newLabel, month, year, amount: newAmount, notes: newNotes || undefined })
    setNewAmount(0)
    setNewNotes('')
    refresh()
  }

  async function handleDeleteVariableCost(id: string) {
    await deleteVariableCost(id)
    refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-end justify-between">
          <div className="flex flex-wrap gap-3">
            <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
            <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div className="flex gap-2">
            <Button variant={tab === 'pnl' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('pnl')}>
              P&amp;L
            </Button>
            <Button variant={tab === 'variable' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('variable')}>
              Variable Costs
            </Button>
          </div>
        </div>

        {report && tab === 'pnl' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-white/50">Internet Collected</p>
                <p className="text-white">{fmtXaf(report.internetCollected)}</p>
              </div>
              <div>
                <p className="text-white/50">Water Collected</p>
                <p className="text-white">{fmtXaf(report.waterCollected)}</p>
              </div>
              <div>
                <p className="text-white/50">Rent Collected</p>
                <p className="text-white">{fmtXaf(report.rentCollected)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Input
                label="Internet provider cost"
                type="number"
                value={internetCost}
                onChange={e => setInternetCost(Number(e.target.value))}
              />
              <Input
                label="Water provider cost"
                type="number"
                value={waterCost}
                onChange={e => setWaterCost(Number(e.target.value))}
              />
              <div className="self-end">
                <Button onClick={handleSaveCosts}>Save Costs</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-white/50">Internet Profit</p>
                <p className="text-white">{fmtXaf(report.internetProfit)}</p>
              </div>
              <div>
                <p className="text-white/50">Water Profit</p>
                <p className="text-white">{fmtXaf(report.waterProfit)}</p>
              </div>
              <div>
                <p className="text-white/50">Variable Costs</p>
                <p className="text-white">{fmtXaf(report.totalVariableCosts)}</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="font-semibold text-teal">Net Profit</p>
              <p className="text-lg font-bold text-white">{fmtXaf(report.netProfit)}</p>
            </div>
          </div>
        )}

        {report && tab === 'variable' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Input label="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. House Repairs" />
              <Input label="Amount" type="number" value={newAmount} onChange={e => setNewAmount(Number(e.target.value))} />
              <Input label="Notes (optional)" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
              <div className="self-end">
                <Button onClick={handleAddVariableCost}>Add</Button>
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50">
                <tr>
                  <th className="pb-2">Label</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Notes</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.variableCosts.map(v => (
                  <tr key={v.id} className="border-t border-white/10">
                    <td className="py-2 text-white">{v.label}</td>
                    <td className="py-2 text-white/70">{fmtXaf(v.amount)}</td>
                    <td className="py-2 text-white/70">{v.notes || '—'}</td>
                    <td className="py-2">
                      <button className="text-red-400 hover:underline" onClick={() => handleDeleteVariableCost(v.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {report.variableCosts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-white/40">
                      No variable costs recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div className="flex justify-between border-t border-white/10 pt-3 text-sm font-semibold">
              <span className="text-white/70">Total Variable Costs</span>
              <span className="text-white">{fmtXaf(report.totalVariableCosts)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
