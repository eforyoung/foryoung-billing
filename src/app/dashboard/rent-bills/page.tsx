import { RentBillForm } from '@/features/rent/RentBillForm'
import { RentBillList } from '@/features/rent/RentBillList'

export default function RentBillsPage() {
  return (
    <div className="space-y-6">
      <RentBillForm />
      <RentBillList />
    </div>
  )
}
