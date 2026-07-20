# Foryoung's Billing — Bill Payment Platform Design

**Date:** 2026-07-20
**Status:** Approved Design

## Overview

A rebuild of the existing single-file HTML/localStorage "Bill Payment Platform"
(`C:\JENEUS FILES\BILL PAYMENT\billing-platform.html`) as a proper multi-user
web application with a real Postgres database, following the same stack and
conventions as `support-platform`. It manages monthly utility/rent billing
(Internet, Water, Rent) for tenants of a residential/commercial building:
client registration, meter readings, bill generation, payment tracking, and
profit/loss reconciliation against provider costs.

The original 2026-06-11 design (`BILL PAYMENT/docs/superpowers/specs/2026-06-11-bill-payment-platform-design.md`)
specced a WPF/SQLite desktop app, but that was never built — the app that
actually shipped and has been in production use since is the HTML/localStorage
version, which has grown well past that original spec (Rent Bills, arrears
consolidation, receipts, editable Terms, GitHub-API sync as a backup
mechanism). **This design targets full feature parity with the current
`billing-platform.html` app**, not the old WPF spec. `localStorage` +
GitHub-sync-as-backup is replaced outright by a real Postgres database, so
the GitHub sync feature is dropped — it existed only to work around
`localStorage` not being a real multi-device database.

## Relationship to support-platform

Standalone project — separate repo, separate Vercel project, separate
Postgres database, separate domain. It deliberately does **not** become a
new module inside `support-platform`; it reuses that project's *stack and
conventions* (Next.js/Prisma/NextAuth/Tailwind patterns, `lib/ui` components,
dark navy/teal theme, `features/{module}/actions.ts` server-action pattern)
without sharing its database, auth, or deployment.

## Technology Stack

| Component | Choice | Reason |
|---|---|---|
| Framework | Next.js 16 (App Router), TypeScript | Matches support-platform |
| Auth | NextAuth v5, Credentials provider, bcryptjs, JWT sessions | Matches support-platform |
| Database | PostgreSQL via Prisma — Vercel Postgres in prod, local Postgres in dev | Matches support-platform |
| UI | Tailwind v4, dark navy/teal theme, `lib/ui` component set | Visual/behavioral consistency with support-platform |
| PDF/Receipts | jsPDF vector direct-draw (not `window.print()` / html2canvas) | Avoids the "lines through text" bug found and fixed in support-platform's invoice PDF (`InvoicePDF.tsx`) |
| Repo | `C:\JENEUS FILES\Foryoung's-Billing`, GitHub repo `Foryoung-Billing` | User-specified |
| Deploy | New Vercel project, custom domain `platform.jeneustech.com` | User-specified |

## Target Users

- **Admin** (Foryoung Eustace Mukong / building owner): full access to every
  module, including Reports/P&L and Terms.
- **Caretaker**: manages Clients, enters meter readings, generates bills
  (Internet/Water/Rent), and records payments. Cannot view Reports or edit
  Terms — those actions/pages are blocked server-side.

No self-service client/tenant portal — this is an internal management tool
only, same as the original app.

## Auth & RBAC

Two-role enum (`ADMIN`, `CARETAKER`) on `User`, no per-module permission
matrix table (unlike support-platform's `UserModule`) — with only two fixed
roles and a small, stable set of restricted modules, a full permission
matrix is unnecessary complexity. A single `requireAdmin(session)` helper in
`lib/auth/permissions.ts` gates the Reports and Terms server actions; every
other action just requires a valid session via `auth()`. The sidebar hides
Reports/Terms nav items for Caretaker sessions.

## Data Model (Prisma)

```prisma
enum Role { ADMIN CARETAKER }
enum ServiceType { INTERNET WATER RENT }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  active       Boolean  @default(true)
}

model Client {
  id        String          @id @default(uuid())
  name      String
  phone     String
  email     String?
  unit      String?
  isActive  Boolean         @default(true)
  notes     String?
  createdAt DateTime        @default(now())
  services  ClientService[]
  bills     Bill[]
  readings  WaterReading[]
}

// One row per service a client subscribes to. Replaces the original app's
// hasInternet/hasWater/hasRent booleans + bolted-on rentAmount field on
// Client — normalizing this makes Reports/arrears queries straightforward
// and makes adding a future 4th service type a schema-only change.
model ClientService {
  id       String      @id @default(uuid())
  clientId String
  client   Client      @relation(fields: [clientId], references: [id])
  type     ServiceType
  rate     Decimal?    // 10000 for INTERNET, the rent amount for RENT, null for WATER (computed from meter readings)
  @@unique([clientId, type])
}

model Bill {
  id          String        @id @default(uuid())
  clientId    String
  client      Client        @relation(fields: [clientId], references: [id])
  serviceType ServiceType
  month       Int
  year        Int
  monthsCount Int           @default(1)   // consolidated arrears billing (Internet)
  amount      Decimal
  isPaid      Boolean       @default(false)
  paidDate    DateTime?
  createdAt   DateTime      @default(now())
  payment     Payment?
  reading     WaterReading?
}

model WaterReading {
  id              String   @id @default(uuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  billId          String?  @unique
  bill            Bill?    @relation(fields: [billId], references: [id])
  month           Int
  year            Int
  previousReading Decimal
  currentReading  Decimal
  consumption     Decimal
  consumptionCost Decimal
  electricityFee  Decimal  @default(1000)
  pumpServiceFee  Decimal  @default(2000)
  defaultTaxShare Decimal  @default(0)  // zero-consumption case: (780+150)/activeWaterTenants
  readingDate     DateTime @default(now())
}

model ProviderCost {
  id          String      @id @default(uuid())
  serviceType ServiceType // INTERNET or WATER
  month       Int
  year        Int
  amount      Decimal
  notes       String?
}

model Payment {
  id          String   @id @default(uuid())
  billId      String   @unique
  bill        Bill     @relation(fields: [billId], references: [id])
  amountPaid  Decimal
  paymentDate DateTime @default(now())
  notes       String?
  recordedBy  String?  // User id
}

// Singleton row, same pattern as support-platform's CompanySettings
model BillingSettings {
  id        Int      @id @default(1)
  termsText String   @default("")
  updatedAt DateTime @updatedAt
}
```

### Billing Calculations

Ported exactly from `billing-platform.html`'s `computeWaterBillTotal()`,
`onInternetFormChange()`/`checkInternetArrears()`, and rent generation logic.

**Internet:** `total = 10000 × monthsCount` (a client can be billed for
multiple consolidated unpaid months at once via the arrears flow).

**Water:**
```
consumption = max(0, currentReading − previousReading)
if consumption == 0:
    tenants = count(active clients with a WATER ClientService)
    defaultTaxShare = tenants > 0 ? round(930 / tenants) : 930   // 930 = 780 + 150
    total = defaultTaxShare + 1000 (electricity) + 2000 (pump)
else:
    total = consumption × 700 + 1000 (electricity) + 2000 (pump)
```
`previousReading` auto-fills from the client's most recent `WaterReading`;
if none exists, it's entered manually on first reading.

**Rent:** `total = ClientService.rate` for the RENT service type (entered
per-client when the Rent service is enabled).

**Arrears (Internet):** on selecting a client + period, find prior unpaid
Internet bills before that period, sum `monthsCount` and `amount`, and offer
to consolidate them into one bill.

**Profit/Loss (Reports):**
```
internetProfit = sum(paid Internet bills in period) − internetProviderCost
waterProfit    = sum(paid Water bills in period) − waterProviderCost
netProfit      = internetProfit + waterProfit
```
(Rent has no provider cost / P&L — it's pure income.)

## Feature Modules

Each follows support-platform's `features/{module}/actions.ts` +
`*List.tsx`/`*Detail.tsx` pattern.

| Module | Access | Summary |
|---|---|---|
| Dashboard | All | 4 summary cards (Total Clients, Active This Month, Unpaid Bills, Revenue This Month) + recent unpaid bills |
| Clients | All | List/search, Add/Edit (name, phone, email, unit, service checkboxes → `ClientService` rows, active toggle) |
| Internet Bills | All | Generate (client → months → 10,000×months), arrears detection & consolidation, mark paid, receipt |
| Water Bills | All | Meter reading entry with live breakdown preview, generate bill, mark paid, receipt |
| Rent Bills | All | Generate from `ClientService` rent rate, mark paid, receipt |
| Payments | All | Filter by month/service, payment history, mark-as-paid (writes `Payment`, flips `Bill.isPaid`) |
| Reports | Admin only | Internet/Water P&L vs `ProviderCost`, monthly history, net profit |
| Terms | Admin only | Edit `BillingSettings.termsText`, shown on receipts |

Receipts: one shared `generateReceiptPDF()` using jsPDF direct-draw (company
header, client info, bill breakdown, amount, paid date) — same technique as
support-platform's fixed `InvoicePDF.tsx`.

## Data Migration

One-time script (`prisma/seed-migrate.ts`), run once after the schema is
pushed to the production database:

- Reads `C:\JENEUS FILES\BILL PAYMENT\data\billing-data.json`
- Maps `bp_clients` → `Client`, deriving `ClientService` rows from
  `hasInternet`/`hasWater`/`hasRent` + `rentAmount`
- Maps `bp_bills` → `Bill`, `bp_waterReadings` → `WaterReading`,
  `bp_payments` → `Payment`, `bp_providerCosts` → `ProviderCost`, preserving
  original dates
- Maps `bp_terms` → `BillingSettings.termsText`
- Old integer IDs are remapped to generated UUIDs via an in-memory lookup
  table so foreign keys stay consistent
- Idempotent guard: skips entirely if the `Client` table is already
  non-empty, so it's safe to re-run by accident

## Deployment

- New Vercel project linked to the `Foryoung-Billing` GitHub repo
- Vercel Postgres provisioned for the project (same mechanism as
  support-platform: yields `DATABASE_URL`/`POSTGRES_URL`/`PRISMA_DATABASE_URL`)
- Fresh `AUTH_SECRET` (not reused from support-platform)
- Domain `platform.jeneustech.com` added in Vercel project settings + DNS
  CNAME at the registrar (same pattern as `support.jeneustech.com`)
- Migration script run once against the production DB after first deploy
  (`vercel env pull` + local `tsx` run) to seed the initial admin user and
  import migrated data

## Error Handling

- Cannot create a bill for an inactive client
- Water meter reading must be ≥ previous reading is NOT enforced as a hard
  block (the original app allows equal readings — that's the zero-consumption
  case with its own tax-share formula); a reading below the previous one is
  rejected
- Cannot enter a duplicate bill for the same client + month + service
- Server actions return `{ success: false, error }` on failure, no nested
  Prisma transactions (learned from support-platform's save-hang incident)

## Testing

- Vitest unit tests for the billing calculators (`computeWaterBillTotal`
  equivalent, arrears consolidation, internet/rent totals) — money
  calculations are the highest-risk area for a silent bug
- Manual smoke test of each module via the `run` skill once scaffolded,
  before first deploy

## Out of Scope (v1)

- Client/tenant self-service portal
- SMS/email notifications
- GitHub-API sync (superseded by the real Postgres database)
- Export to Excel
