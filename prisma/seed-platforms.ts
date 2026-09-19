/**
 * One-off backfill: creates the "The Foryoung's" platform and assigns all
 * existing Clients, ProviderCosts, VariableCosts, and BillingSettings to it.
 *
 * Run ONCE after the Phase-1 schema push (nullable platformId columns added),
 * then update schema to make platformId required, then push again.
 *
 *   npx ts-node --project tsconfig.json prisma/seed-platforms.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Create (or retrieve) the Foryoung's platform
  const platform = await prisma.platform.upsert({
    where: { slug: 'foryoungs' },
    update: {},
    create: { name: "The Foryoung's", slug: 'foryoungs' },
  })
  console.log(`Platform: ${platform.name} (${platform.id})`)

  // 2. Assign all existing clients
  const { count: clientCount } = await prisma.client.updateMany({
    where: { platformId: null },
    data: { platformId: platform.id },
  })
  console.log(`Assigned ${clientCount} clients`)

  // 3. Assign all existing provider costs
  const { count: providerCount } = await prisma.providerCost.updateMany({
    where: { platformId: null },
    data: { platformId: platform.id },
  })
  console.log(`Assigned ${providerCount} provider costs`)

  // 4. Assign all existing variable costs
  const { count: varCount } = await prisma.variableCost.updateMany({
    where: { platformId: null },
    data: { platformId: platform.id },
  })
  console.log(`Assigned ${varCount} variable costs`)

  // 5. Assign billing settings (the singleton row id=1 if it exists)
  const { count: settingsCount } = await prisma.billingSettings.updateMany({
    where: { platformId: null },
    data: { platformId: platform.id },
  })
  console.log(`Assigned ${settingsCount} billing settings rows`)

  console.log('\nBackfill complete. Now update schema.prisma to make platformId required, then run: npx prisma db push')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
