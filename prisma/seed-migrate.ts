import { PrismaClient, ServiceType } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()
const LEGACY_JSON_PATH = 'C:\\JENEUS FILES\\BILL PAYMENT\\data\\billing-data.json'

interface LegacyClient {
  id: number
  name: string
  phone: string
  email: string | null
  unit: string | null
  hasInternet: boolean
  hasWater: boolean
  hasRent: boolean
  rentAmount: number
  isActive: boolean
  notes: string | null
  createdAt: string
}

interface LegacyBill {
  id: number
  clientId: number
  serviceType: 'Internet' | 'Water' | 'Rent'
  month: number
  year: number
  monthsCount?: number
  amount: number
  isPaid: boolean
  paidDate: string | null
  createdAt: string
}

interface LegacyWaterReading {
  id: number
  clientId: number
  billId: number | null
  month: number
  year: number
  previousReading: number
  currentReading: number
  consumption: number
  consumptionCost: number
  electricityFee: number
  pumpServiceFee: number
  readingDate: string
}

interface LegacyPayment {
  id: number
  billId: number
  amountPaid: number
  paymentDate: string
  notes: string | null
}

interface LegacyProviderCost {
  id: number
  serviceType: 'Internet' | 'Water'
  month: number
  year: number
  amount: number
  notes: string | null
}

interface LegacyData {
  data: {
    clients?: LegacyClient[]
    bills?: LegacyBill[]
    waterReadings?: LegacyWaterReading[]
    payments?: LegacyPayment[]
    providerCosts?: LegacyProviderCost[]
    terms?: string
  }
}

const SERVICE_MAP: Record<string, ServiceType> = { Internet: 'INTERNET', Water: 'WATER', Rent: 'RENT' }

async function main() {
  const alreadyMigrated = await prisma.client.count()
  if (alreadyMigrated > 0) {
    console.log('Client table is not empty — skipping migration (already ran, or seed.ts already created data).')
    return
  }

  const raw = readFileSync(LEGACY_JSON_PATH, 'utf-8')
  const parsed: LegacyData = JSON.parse(raw)
  const legacy = parsed.data

  const clientIdMap = new Map<number, string>()

  for (const c of legacy.clients ?? []) {
    const client = await prisma.client.create({
      data: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        unit: c.unit,
        isActive: c.isActive,
        notes: c.notes,
        createdAt: new Date(c.createdAt),
      },
    })
    clientIdMap.set(c.id, client.id)

    const services: { type: ServiceType; rate: number | null }[] = []
    if (c.hasInternet) services.push({ type: 'INTERNET', rate: 10000 })
    if (c.hasWater) services.push({ type: 'WATER', rate: null })
    if (c.hasRent) services.push({ type: 'RENT', rate: c.rentAmount })
    if (services.length > 0) {
      await prisma.clientService.createMany({
        data: services.map(s => ({ clientId: client.id, type: s.type, rate: s.rate })),
      })
    }
  }
  console.log(`Migrated ${clientIdMap.size} clients.`)

  const billIdMap = new Map<number, string>()
  for (const b of legacy.bills ?? []) {
    const clientId = clientIdMap.get(b.clientId)
    if (!clientId) continue
    const bill = await prisma.bill.create({
      data: {
        clientId,
        serviceType: SERVICE_MAP[b.serviceType],
        month: b.month,
        year: b.year,
        monthsCount: b.monthsCount ?? 1,
        amount: b.amount,
        isPaid: b.isPaid,
        paidDate: b.paidDate ? new Date(b.paidDate) : null,
        createdAt: new Date(b.createdAt),
      },
    })
    billIdMap.set(b.id, bill.id)
  }
  console.log(`Migrated ${billIdMap.size} bills.`)

  let readingCount = 0
  for (const r of legacy.waterReadings ?? []) {
    const clientId = clientIdMap.get(r.clientId)
    if (!clientId) continue
    await prisma.waterReading.create({
      data: {
        clientId,
        billId: r.billId ? billIdMap.get(r.billId) : undefined,
        month: r.month,
        year: r.year,
        previousReading: r.previousReading,
        currentReading: r.currentReading,
        consumption: r.consumption,
        consumptionCost: r.consumptionCost,
        electricityFee: r.electricityFee,
        pumpServiceFee: r.pumpServiceFee,
        readingDate: new Date(r.readingDate),
      },
    })
    readingCount++
  }
  console.log(`Migrated ${readingCount} water readings.`)

  let paymentCount = 0
  for (const p of legacy.payments ?? []) {
    const billId = billIdMap.get(p.billId)
    if (!billId) continue
    await prisma.payment.create({
      data: { billId, amountPaid: p.amountPaid, paymentDate: new Date(p.paymentDate), notes: p.notes },
    })
    paymentCount++
  }
  console.log(`Migrated ${paymentCount} payments.`)

  let costCount = 0
  for (const pc of legacy.providerCosts ?? []) {
    await prisma.providerCost.create({
      data: { serviceType: SERVICE_MAP[pc.serviceType], month: pc.month, year: pc.year, amount: pc.amount, notes: pc.notes },
    })
    costCount++
  }
  console.log(`Migrated ${costCount} provider costs.`)

  if (legacy.terms) {
    await prisma.billingSettings.upsert({
      where: { id: 1 },
      update: { termsText: legacy.terms },
      create: { id: 1, termsText: legacy.terms },
    })
    console.log('Migrated terms text.')
  }

  console.log('Migration complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
