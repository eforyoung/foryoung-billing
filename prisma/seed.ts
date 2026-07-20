import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = 'admin123'
  const caretakerPassword = 'caretaker123'

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jeneustech.com' },
    update: {},
    create: {
      email: 'admin@jeneustech.com',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: 'Foryoung Eustace Mukong',
      role: Role.ADMIN,
    },
  })

  const caretaker = await prisma.user.upsert({
    where: { email: 'caretaker@jeneustech.com' },
    update: {},
    create: {
      email: 'caretaker@jeneustech.com',
      passwordHash: await bcrypt.hash(caretakerPassword, 10),
      name: 'Caretaker',
      role: Role.CARETAKER,
    },
  })

  await prisma.billingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, termsText: 'Payment is due within 30 days of invoice date.' },
  })

  console.log('Seeded users:')
  console.log(`  ADMIN:      ${admin.email} / ${adminPassword}`)
  console.log(`  CARETAKER:  ${caretaker.email} / ${caretakerPassword}`)
  console.log('Change these passwords after first login.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
