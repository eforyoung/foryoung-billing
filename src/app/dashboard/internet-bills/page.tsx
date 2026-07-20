import { InternetBillForm } from '@/features/internet/InternetBillForm'
import { InternetBillList } from '@/features/internet/InternetBillList'

export default function InternetBillsPage() {
  return (
    <div className="space-y-6">
      <InternetBillForm />
      <InternetBillList />
    </div>
  )
}
