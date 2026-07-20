import { PaymentList } from '@/features/payments/PaymentList'
import { PaymentHistory } from '@/features/payments/PaymentHistory'

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <PaymentList />
      <PaymentHistory />
    </div>
  )
}
