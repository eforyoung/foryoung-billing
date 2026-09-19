import { getPlatformBySlug } from '@/lib/platform'
import { notFound } from 'next/navigation'
import { PaymentList } from '@/features/payments/PaymentList'
import { PaymentHistory } from '@/features/payments/PaymentHistory'
import { getUnpaidBills } from '@/features/payments/actions'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function PaymentsPage({ params }: Props) {
  const { platformSlug } = await params
  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  const rawBills = await getUnpaidBills(platform.id)
  const unpaidBills = rawBills.map(b => ({
    ...b,
    dueDate: b.dueDate ? new Date(b.dueDate).toISOString().slice(0, 10) : null,
  }))
  return (
    <div className="space-y-6">
      <PaymentList unpaidBills={unpaidBills} platformId={platform.id} />
      <PaymentHistory platformId={platform.id} />
    </div>
  )
}
