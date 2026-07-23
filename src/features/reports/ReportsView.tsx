'use client'

import { useEffect, useState } from 'react'
import { Card, Input, Button, Badge } from '@/lib/ui'
import { fmtXaf } from '@/lib/utils'
import {
  getReport,
  saveProviderCost,
  saveVariableCost,
  deleteVariableCost,
  getArrears,
  type ReportData,
  type ClientArrearsRow,
} from './actions'

export function ReportsView() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [internetCost, setInternetCost] = useState(0)
  const [waterCost, setWaterCost] = useState(0)
  const [tab, setTab] = useState<'pnl' | 'variable' | 'arrears'>('pnl')
  const [newLabel, setNewLabel] = useState('House Repairs')
  const [newAmount, setNewAmount] = useState(0)
  const [newNotes, setNewNotes] = useState('')
  const [arrears, setArrears] = useState<ClientArrearsRow[]>([])
  const [arrearsLoading, setArrearsLoading] = useState(false)

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

  async function refreshArrears() {
    setArrearsLoading(true)
    const result = await getArrears()
    setArrears('error' in result ? [] : result)
    setArrearsLoading(false)
  }

  function selectTab(next: 'pnl' | 'variable' | 'arrears') {
    setTab(next)
    if (next === 'arrears') refreshArrears()
  }

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
            <Button variant={tab === 'pnl' ? 'primary' : 'ghost'} size="sm" onClick={() => selectTab('pnl')}>
              P&amp;L
            </Button>
            <Button variant={tab === 'variable' ? 'primary' : 'ghost'} size="sm" onClick={() => selectTab('variable')}>
              Variable Costs
            </Button>
            <Button variant={tab === 'arrears' ? 'primary' : 'ghost'} size="sm" onClick={() => selectTab('arrears')}>
              Arrears
            </Button>
          </div>
        </div>

        {report && tab === 'pnl' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Internet Collected</p>
                <p className="text-slate-900">{fmtXaf(report.internetCollected)}</p>
              </div>
              <div>
                <p className="text-slate-500">Water Collected</p>
                <p className="text-slate-900">{fmtXaf(report.waterCollected)}</p>
              </div>
              <div>
                <p className="text-slate-500">Rent Collected</p>
                <p className="text-slate-900">{fmtXaf(report.rentCollected)}</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-sm">
              <div>
                <p className="text-slate-500">Internet Profit</p>
                <p className="text-slate-900">{fmtXaf(report.internetProfit)}</p>
              </div>
              <div>
                <p className="text-slate-500">Water Profit</p>
                <p className="text-slate-900">{fmtXaf(report.waterProfit)}</p>
              </div>
              <div>
                <p className="text-slate-500">Variable Costs</p>
                <p className="text-slate-900">{fmtXaf(report.totalVariableCosts)}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="font-semibold text-navy">Net Profit</p>
              <p className="text-lg font-bold text-slate-900">{fmtXaf(report.netProfit)}</p>
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
              <thead>
                <tr className="bg-navy">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Label</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Amount</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Notes</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.variableCosts.map(v => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{v.label}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtXaf(v.amount)}</td>
                    <td className="px-3 py-2 text-slate-600">{v.notes || '—'}</td>
                    <td className="px-3 py-2">
                      <button className="text-red-600 hover:underline" onClick={() => handleDeleteVariableCost(v.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {report.variableCosts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">
                      No variable costs recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold">
              <span className="text-slate-600">Total Variable Costs</span>
              <span className="text-slate-900">{fmtXaf(report.totalVariableCosts)}</span>
            </div>
          </div>
        )}

        {tab === 'arrears' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Every client with an outstanding balance across Internet, Water, and Rent — worst offenders first.
            </p>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-navy">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Unit</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Internet</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Water</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Rent</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Total Owed</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Unpaid Bills</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Oldest Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {arrears.map(a => (
                  <tr key={a.clientId} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{a.clientName}</td>
                    <td className="px-3 py-2 text-slate-600">{a.clientUnit || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{a.internetOwed > 0 ? fmtXaf(a.internetOwed) : '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{a.waterOwed > 0 ? fmtXaf(a.waterOwed) : '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{a.rentOwed > 0 ? fmtXaf(a.rentOwed) : '—'}</td>
                    <td className="px-3 py-2">
                      <Badge color="amber">{fmtXaf(a.totalOwed)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{a.unpaidBillCount}</td>
                    <td className="px-3 py-2 text-slate-600">{a.oldestUnpaidLabel || '—'}</td>
                  </tr>
                ))}
                {arrears.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-400">
                      {arrearsLoading ? 'Loading…' : 'No clients currently in arrears.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
