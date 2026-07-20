import { WaterReadingForm } from '@/features/water/WaterReadingForm'
import { WaterBillList } from '@/features/water/WaterBillList'

export default function WaterBillsPage() {
  return (
    <div className="space-y-6">
      <WaterReadingForm />
      <WaterBillList />
    </div>
  )
}
