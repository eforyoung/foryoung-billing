import jsPDF from 'jspdf'

export interface ReceiptData {
  receiptNumber: string
  clientName: string
  clientPhone: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  periodLabel: string
  amount: number
  paidDate: string
  notes?: string
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const SERVICE_LABELS: Record<ReceiptData['serviceType'], string> = {
  INTERNET: 'Internet Service',
  WATER: 'Water Service',
  RENT: 'Rent',
}

export function generateReceiptPDF(data: ReceiptData): void {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 20
  const rightX = W - M
  let y = M

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.setTextColor('#1e3a5f')
  pdf.text('JENEUS CO. LTD', M, y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#64748b')
  pdf.text('Immeuble Commercial Bank, 4th Floor, Rue Njo Njo Bonapriso', M, y + 6)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor('#0D9488')
  pdf.text('PAYMENT RECEIPT', rightX, y, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#64748b')
  pdf.text(data.receiptNumber, rightX, y + 6, { align: 'right' })

  y += 16
  pdf.setDrawColor('#0D9488')
  pdf.setLineWidth(0.8)
  pdf.line(M, y, rightX, y)
  y += 10

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor('#0D9488')
  pdf.text('RECEIVED FROM', M, y)
  y += 6
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor('#1e293b')
  pdf.text(data.clientName, M, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#475569')
  pdf.text(data.clientPhone, M, y)

  y += 14
  pdf.setFillColor('#f8fafc')
  pdf.setDrawColor('#1e3a5f')
  pdf.setLineWidth(0.4)
  pdf.roundedRect(M, y, rightX - M, 40, 2, 2, 'FD')

  let ry = y + 10
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#475569')
  pdf.text('Service', M + 6, ry)
  pdf.setTextColor('#1e293b')
  pdf.text(SERVICE_LABELS[data.serviceType], rightX - 6, ry, { align: 'right' })

  ry += 8
  pdf.setTextColor('#475569')
  pdf.text('Period', M + 6, ry)
  pdf.setTextColor('#1e293b')
  pdf.text(data.periodLabel, rightX - 6, ry, { align: 'right' })

  ry += 8
  pdf.setTextColor('#475569')
  pdf.text('Payment Date', M + 6, ry)
  pdf.setTextColor('#1e293b')
  pdf.text(data.paidDate, rightX - 6, ry, { align: 'right' })

  ry += 10
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor('#1e3a5f')
  pdf.text('AMOUNT PAID', M + 6, ry)
  pdf.text(`${fmt(data.amount)} XAF`, rightX - 6, ry, { align: 'right' })

  y += 50

  if (data.notes) {
    pdf.setFont('helvetica', 'italic')
    pdf.setFontSize(8)
    pdf.setTextColor('#64748b')
    pdf.text(`Notes: ${data.notes}`, M, y)
    y += 8
  }

  pdf.setDrawColor('#cbd5e1')
  pdf.setLineWidth(0.15)
  pdf.line(M, 287, rightX, 287)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor('#94a3b8')
  pdf.text('JENEUS CO. LTD', M, 292)

  pdf.save(`Receipt-${data.receiptNumber.replace(/\//g, '-')}.pdf`)
}
