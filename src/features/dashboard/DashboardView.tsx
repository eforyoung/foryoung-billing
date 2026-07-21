import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getDashboardSummary } from './actions'

export async function DashboardView() {
  const summary = await getDashboardSummary()

  const cards = [
    { label: 'Total Clients', value: summary.totalClients },
    { label: 'Active Clients', value: summary.activeClients },
    { label: 'Unpaid Bills', value: summary.unpaidBillsCount },
    { label: 'Revenue This Month', value: fmtXaf(summary.revenueThisMonth) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            <thead className="text-slate-500">
              <tr>
                <th className="pb-2">Client</th>
                <th className="pb-2">Service</th>
                <th className="pb-2">Period</th>
                <th className="pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentUnpaid.map(b => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="py-2 text-slate-900">{b.clientName}</td>
                  <td className="py-2">
                    <Badge color="blue">{b.serviceType}</Badge>
                  </td>
                  <td className="py-2 text-slate-600">
                    {monthName(b.month)} {b.year}
                  </td>
                  <td className="py-2 text-slate-600">{fmtXaf(b.amount)}</td>
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
