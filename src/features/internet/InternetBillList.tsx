import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getInternetBills } from './actions'
import { InternetBillRowActions } from './InternetBillRowActions'

export async function InternetBillList() {
  const bills = await getInternetBills()
  return (
    <Card title="Internet Bills">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Period</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Amount</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Due Date</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Payment Date</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Status</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-900">{b.client.name}</td>
              <td className="px-3 py-2 text-slate-600">
                {monthName(b.month)} {b.year}
                {b.monthsCount > 1 ? ` (${b.monthsCount} months)` : ''}
              </td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(Number(b.amount))}</td>
              <td className="px-3 py-2 text-slate-600">{b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : '—'}</td>
              <td className="px-3 py-2 text-slate-600">{b.paidDate ? new Date(b.paidDate).toLocaleDateString('en-GB') : '—'}</td>
              <td className="px-3 py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
              <td className="px-3 py-2">
                {!b.isPaid && (
                  <InternetBillRowActions
                    bill={{
                      id: b.id,
                      month: b.month,
                      year: b.year,
                      monthsCount: b.monthsCount,
                      dueDate: b.dueDate ? new Date(b.dueDate).toISOString().slice(0, 10) : null,
                    }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  )
}
