import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getRentBills } from './actions'
import { RentBillRowActions } from './RentBillRowActions'

export async function RentBillList() {
  const bills = await getRentBills()
  return (
    <Card title="Rent Bills">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Due Date</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="py-2 text-slate-900">{b.client.name}</td>
              <td className="py-2 text-slate-600">
                {monthName(b.month)} {b.year}
                {b.monthsCount > 1 ? ` (${b.monthsCount} months)` : ''}
              </td>
              <td className="py-2 text-slate-600">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2 text-slate-600">{b.dueDate ? new Date(b.dueDate).toLocaleDateString('en-GB') : '—'}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
              <td className="py-2">
                {!b.isPaid && (
                  <RentBillRowActions
                    bill={{
                      id: b.id,
                      month: b.month,
                      year: b.year,
                      amount: Number(b.amount),
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
