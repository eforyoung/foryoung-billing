import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getDashboardSummary } from './actions'

export async function DashboardView({ platformId }: { platformId: string }) {
  const summary = await getDashboardSummary(platformId)

  const cards = [
    { label: 'Total Clients', value: summary.totalClients },
    { label: 'Active Clients', value: summary.activeClients },
    { label: 'Unpaid Bills', value: summary.unpaidBillsCount },
    { label: 'Revenue This Month', value: fmtXaf(summary.revenueThisMonth) },
    { label: 'Total Arrears', value: fmtXaf(summary.totalArrears) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(c => (
          <Card key={c.label}>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card title="Recent Unpaid Bills">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-navy">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Service</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Period</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Balance Due</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentUnpaid.map(b => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-900">{b.clientName}</td>
                  <td className="px-3 py-2">
                    <Badge color="blue">{b.serviceType}</Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {monthName(b.month)} {b.year}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{fmtXaf(b.balanceDue)}</td>
                </tr>
              ))}
              {summary.recentUnpaid.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    No unpaid bills.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
