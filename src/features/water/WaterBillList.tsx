import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getWaterBills } from './actions'

export async function WaterBillList() {
  const bills = await getWaterBills()
  return (
    <Card title="Water Bills">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Consumption</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-white/70">{b.reading ? `${Number(b.reading.consumption)} m³` : '—'}</td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
