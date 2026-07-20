'use client'

import { useEffect, useState } from 'react'
import { Card, Input, Button } from '@/lib/ui'
import { fmtXaf } from '@/lib/utils'
import { getReport, saveProviderCost, type ReportData } from './actions'

export function ReportsView() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [internetCost, setInternetCost] = useState(0)
  const [waterCost, setWaterCost] = useState(0)

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

  return (
    <div className="space-y-6">
      <Card title="Monthly P&L">
        <div className="mb-4 flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
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

            <div className="flex gap-3">
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

            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-white/50">Internet Profit</p>
                <p className="text-white">{fmtXaf(report.internetProfit)}</p>
              </div>
              <div>
                <p className="text-white/50">Water Profit</p>
                <p className="text-white">{fmtXaf(report.waterProfit)}</p>
              </div>
              <div>
                <p className="font-semibold text-teal">Net Profit</p>
                <p className="text-lg font-bold text-white">{fmtXaf(report.netProfit)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
