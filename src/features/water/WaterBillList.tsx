import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getWaterBills } from './actions'
import { WaterBillRowActions } from './WaterBillRowActions'

export async function WaterBillList() {
  const bills = await getWaterBills()
  return (
    <Card title="Water Bills">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-navy">
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Client</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Period</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Consumption</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Amount</th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white">Balance Due</th>
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
              </td>
              <td className="px-3 py-2 text-slate-600">{b.reading ? `${Number(b.reading.consumption)} m³` : '—'}</td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(Number(b.amount))}</td>
              <td className="px-3 py-2 text-slate-600">{fmtXaf(Number(b.amount) - Number(b.amountPaid))}</td>
              <td className="px-3 py-2">
                {b.isPaid ? (
                  <Badge color="green">Paid</Badge>
                ) : Number(b.amountPaid) > 0 ? (
                  <Badge color="blue">Partial</Badge>
                ) : (
                  <Badge color="amber">Unpaid</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                {Number(b.amountPaid) === 0 && b.reading && (
                  <WaterBillRowActions
                    bill={{
                      id: b.id,
                      month: b.month,
                      year: b.year,
                      previousReading: b.reading.previousReading,
                      currentReading: b.reading.currentReading,
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
