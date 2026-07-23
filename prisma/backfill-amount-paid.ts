import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const paidBills = await prisma.bill.findMany({ where: { isPaid: true }, include: { payments: true } })

  let updated = 0
  for (const bill of paidBills) {
    const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0)
    const amountPaid = totalPaid > 0 ? totalPaid : Number(bill.amount)
    await prisma.bill.update({ where: { id: bill.id }, data: { amountPaid } })
    updated++
  }

  console.log(`Backfilled amountPaid for ${updated} already-paid bills.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
