import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getWaterBills } from './actions'
import { WaterBillRowActions } from './WaterBillRowActions'
import { WaterReadingForm } from './WaterReadingForm'

export async function WaterBillList({ platformId }: { platformId: string }) {
  const bills = await getWaterBills(platformId)
  return (
    <div className="space-y-6">
      <WaterReadingForm platformId={platformId} />
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
                <td className="px-3 py-2 text-slate-600">{monthName(b.month)} {b.year}</td>
                <td className="px-3 py-2 text-slate-600">{b.reading ? `${b.reading.consumption} m³` : '—'}</td>
                <td className="px-3 py-2 text-slate-600">{fmtXaf(b.amount)}</td>
                <td className="px-3 py-2 text-slate-600">{fmtXaf(b.amount - b.amountPaid)}</td>
                <td className="px-3 py-2">
                  {b.isPaid ? (
                    <Badge color="green">Paid</Badge>
                  ) : b.amountPaid > 0 ? (
                    <Badge color="blue">Partial</Badge>
                  ) : (
                    <Badge color="amber">Unpaid</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  {b.amountPaid === 0 && b.reading && (
                    <WaterBillRowActions
                      bill={{
                        id: b.id,
                        month: b.month,
                        year: b.year,
                        previousReading: b.reading.previousReading,
                        currentReading: b.reading.currentReading,
                        platformId,
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-slate-400">No water bills yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  )
}
