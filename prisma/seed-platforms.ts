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

  // 2-5. After Phase 2 the platformId column is required (non-nullable).
  // All rows were already backfilled when Phase 1 ran this script.
  // These counts are informational only.
  const clientCount = await prisma.client.count({ where: { platformId: platform.id } })
  console.log(`Clients on platform: ${clientCount}`)

  const providerCount = await prisma.providerCost.count({ where: { platformId: platform.id } })
  console.log(`Provider costs on platform: ${providerCount}`)

  const varCount = await prisma.variableCost.count({ where: { platformId: platform.id } })
  console.log(`Variable costs on platform: ${varCount}`)

  const settingsCount = await prisma.billingSettings.count({ where: { platformId: platform.id } })
  console.log(`Billing settings rows on platform: ${settingsCount}`)

  console.log('\nDone. Phase 2 schema already applied — platformId is required on all data models.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async e => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
