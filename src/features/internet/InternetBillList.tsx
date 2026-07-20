import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getInternetBills } from './actions'
import { InternetBillRowActions } from './InternetBillRowActions'

export async function InternetBillList() {
  const bills = await getInternetBills()
  return (
    <Card title="Internet Bills">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
                {b.monthsCount > 1 ? ` (${b.monthsCount} months)` : ''}
              </td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
              <td className="py-2">
                {!b.isPaid && (
                  <InternetBillRowActions bill={{ id: b.id, month: b.month, year: b.year, monthsCount: b.monthsCount }} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
