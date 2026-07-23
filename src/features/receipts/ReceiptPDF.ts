import jsPDF from 'jspdf'
import { monthName } from '@/lib/utils'

export interface ReceiptWaterReading {
  consumption: number
  consumptionCost: number
}

export interface ReceiptBillInput {
  id: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  month: number
  year: number
  monthsCount: number
  billTotal: number
  amountPaidNow: number
  balanceRemaining: number
  paidDate: string
  notes?: string | null
  dueDate?: string | null
  client: { name: string; unit: string | null; phone: string }
  reading?: ReceiptWaterReading | null
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const SERVICE_LABELS: Record<ReceiptBillInput['serviceType'], string> = {
  INTERNET: 'Internet',
  WATER: 'Water',
  RENT: 'Rent',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

function receiptNumber(bill: ReceiptBillInput): string {
  let hash = 0
  for (let i = 0; i < bill.id.length; i++) {
    hash = (hash + bill.id.charCodeAt(i) * (i + 1)) % 10000
  }
  return `RCP-${String(hash).padStart(4, '0')}-${bill.year}`
}

function buildDetailLines(bill: ReceiptBillInput): { label: string; value: string }[] {
  if (bill.serviceType === 'INTERNET') {
    return [
      { label: 'Rate', value: '10,000 F/mo' },
      { label: 'Months', value: String(bill.monthsCount || 1) },
    ]
  }
  if (bill.serviceType === 'WATER') {
    const r = bill.reading
    if (!r) return []
    if (r.consumption === 0) {
      return [
        { label: 'Consumption', value: '0 m³' },
        { label: 'Default Tax — Base', value: '780 F' },
        { label: 'Default Tax — Surcharge', value: '150 F' },
        { label: 'Electricity Fee (flat)', value: '1,000 F' },
        { label: 'Pump Service Fee (flat)', value: '2,000 F' },
      ]
    }
    return [
      { label: 'Consumption', value: `${r.consumption.toFixed(1)} m³` },
      { label: 'Rate', value: '700 F/m³' },
      { label: 'Consumption Cost', value: fmt(r.consumptionCost) },
      { label: 'Electricity Fee (flat)', value: '1,000 F' },
      { label: 'Pump Service Fee (flat)', value: '2,000 F' },
    ]
  }
  // RENT
  const months = bill.monthsCount || 1
  const perMonth = months > 0 ? bill.billTotal / months : bill.billTotal
  return [
    { label: 'Rate', value: `${fmt(perMonth)}/mo` },
    { label: 'Months', value: String(months) },
    { label: 'Due Date', value: bill.dueDate ? formatDate(bill.dueDate) : '—' },
  ]
}

export function generateReceiptPDF(bill: ReceiptBillInput): void {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 20
  const rightX = W - M
  const centerX = W / 2
  let y = M

  // Header
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor('#1e3a5f')
  pdf.text("THE FORYOUNG'S", centerX, y, { align: 'center' })
  y += 6

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#64748b')
  pdf.text('BILL PAYMENT PLATFORM', centerX, y, { align: 'center' })
  y += 6

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor('#1e3a5f')
  pdf.text(receiptNumber(bill), centerX, y, { align: 'center' })
  y += 4

  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.6)
  pdf.line(M, y, rightX, y)
  y += 8

  function row(label: string, value: string, opts?: { bold?: boolean; color?: string }) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor('#64748b')
    pdf.text(label, M, y)
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal')
    pdf.setTextColor(opts?.color ?? '#1e293b')
    pdf.text(value, rightX, y, { align: 'right' })
    y += 6
  }

  function dashedDivider() {
    pdf.setDrawColor('#cbd5e1')
    pdf.setLineWidth(0.2)
    pdf.setLineDashPattern([1, 1], 0)
    pdf.line(M, y, rightX, y)
    pdf.setLineDashPattern([], 0)
    y += 6
  }

  row('Client', bill.client.name, { bold: true })
  row('Unit', bill.client.unit || '—')
  row('Phone', bill.client.phone)

  dashedDivider()

  row('Service', SERVICE_LABELS[bill.serviceType])
  row('Period', `${monthName(bill.month)} ${bill.year}`)
  for (const line of buildDetailLines(bill)) {
    row(line.label, line.value)
  }
  if (bill.notes) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(9)
    pdf.setTextColor('#475569')
    pdf.text('Notes', M, y)
    const noteLines = pdf.splitTextToSize(bill.notes, 90)
    pdf.text(noteLines, rightX, y, { align: 'right' })
    y += 6 * noteLines.length
  }

  dashedDivider()

  const isPaidInFull = bill.balanceRemaining <= 0

  row('Bill Total', `${fmt(bill.billTotal)} XAF`)

  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.6)
  pdf.line(M, y - 3, rightX, y - 3)
  y += 2
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor('#1e3a5f')
  pdf.text('Amount Paid (this payment)', M, y)
  pdf.text(`${fmt(bill.amountPaidNow)} XAF`, rightX, y, { align: 'right' })
  y += 8

  if (!isPaidInFull) {
    row('Balance Remaining', `${fmt(bill.balanceRemaining)} XAF`, { color: '#b45309', bold: true })
  }
  row('Payment Date', formatDate(bill.paidDate))
  row('Status', isPaidInFull ? 'Paid in Full' : 'Partial Payment', {
    color: isPaidInFull ? '#059669' : '#b45309',
    bold: true,
  })

  dashedDivider()

  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(9)
  pdf.setTextColor('#94a3b8')
  pdf.text('Thank you for your payment!', centerX, y, { align: 'center' })

  pdf.setDrawColor('#e2e8f0')
  pdf.setLineWidth(0.15)
  pdf.line(M, 287, rightX, 287)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor('#94a3b8')
  pdf.text("Generated by THE FORYOUNG'S Bill Payment Platform", centerX, 292, { align: 'center' })

  pdf.save(`Receipt-${receiptNumber(bill).replace(/\//g, '-')}.pdf`)
}
