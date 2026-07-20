# Bill Payment Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `BILL PAYMENT/billing-platform.html` (a single-file localStorage app) as a multi-user Next.js + Prisma + Postgres app, deployed standalone to `platform.jeneustech.com`, matching support-platform's stack and conventions.

**Architecture:** Next.js 16 App Router with server actions per feature module (`features/{module}/actions.ts`), Prisma/Postgres for persistence, NextAuth v5 Credentials + JWT for two-role auth (ADMIN/CARETAKER), jsPDF direct-draw for receipts. Billing math lives in pure, unit-tested functions (`features/billing/calculations.ts`) consumed by each service module's actions.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6, PostgreSQL, NextAuth v5 beta, bcryptjs, Tailwind CSS v4, jsPDF, Vitest, react-hook-form + Zod.

## Global Constraints

- Repo root: `C:\JENEUS FILES\Foryoungs-Billing` (git already initialized, spec committed at `docs/superpowers/specs/2026-07-20-bill-payment-platform-design.md`)
- Two roles only: `ADMIN`, `CARETAKER`. No per-module permission matrix table — use a single `requireAdmin()` check, enforced only in Reports and Terms actions.
- Water bill formula (exact, from spec): `consumption = max(0, current − previous)`. If `consumption === 0`: `total = (tenants > 0 ? round(930/tenants) : 930) + 1000 + 2000`. Else: `total = consumption × 700 + 1000 + 2000`.
- Internet bill: `total = 10000 × monthsCount`.
- Rent bill: `total = ClientService.rate` for the RENT service.
- Receipts and all PDF output use jsPDF direct vector drawing — never `window.print()` or html2canvas (this caused the "lines through text" bug fixed in support-platform's invoice PDF).
- Server actions always: start with `'use server'`, call `auth()` and check `session?.user` first, return `ActionResult` (`{ success: true; data?: T } | { success: false; error: string }`), call `revalidatePath()` after mutations, no nested Prisma transactions.
- All money values are XAF integers (no decimals in practice, but stored as Prisma `Decimal` to match support-platform's convention).
- Currency formatting: `n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })` + `' XAF'`, same as both existing apps.

---

## File Structure

```
Foryoungs-Billing/
  package.json, tsconfig.json, next.config.ts, postcss.config.mjs
  .env.example, .env (gitignored), .gitignore
  prisma/
    schema.prisma
    seed.ts               — creates ADMIN + CARETAKER users
    seed-migrate.ts        — one-time import of BILL PAYMENT/data/billing-data.json
  vitest.config.ts
  src/
    app/
      globals.css
      layout.tsx
      (auth)/login/page.tsx
      api/auth/[...nextauth]/route.ts
      dashboard/
        layout.tsx
        page.tsx
        clients/page.tsx
        internet-bills/page.tsx
        water-bills/page.tsx
        rent-bills/page.tsx
        payments/page.tsx
        reports/page.tsx
        terms/page.tsx
    features/
      billing/
        calculations.ts
        calculations.test.ts
      clients/
        actions.ts
        types.ts
        ClientList.tsx
        ClientForm.tsx
      internet/
        actions.ts
        InternetBillList.tsx
        InternetBillForm.tsx
      water/
        actions.ts
        WaterBillList.tsx
        WaterReadingForm.tsx
      rent/
        actions.ts
        RentBillList.tsx
        RentBillForm.tsx
      payments/
        actions.ts
        PaymentList.tsx
      reports/
        actions.ts
        ReportsView.tsx
      terms/
        actions.ts
        TermsEditor.tsx
      dashboard/
        actions.ts
        DashboardView.tsx
      receipts/
        ReceiptPDF.ts
      shell/
        DashboardShell.tsx
        Sidebar.tsx
        Header.tsx
        MobileNav.tsx
    lib/
      auth/
        config.ts
        index.ts
        permissions.ts
      db/
        prisma.ts
      ui/
        Button.tsx
        Card.tsx
        Input.tsx
        Badge.tsx
        Modal.tsx
        SlideOver.tsx
        index.ts
      types.ts
      utils.ts
```

---

### Task 1: Project scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Produces: a runnable `npm run dev` Next.js app with Tailwind v4 dark theme CSS variables `--color-navy`, `--color-teal`, `--color-dark`, `--color-dark-card` available globally.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "foryoungs-billing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "db:seed": "tsx prisma/seed.ts",
    "db:migrate-legacy": "tsx prisma/seed-migrate.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "^5.4.0",
    "@prisma/client": "^6.19.3",
    "bcryptjs": "^3.0.3",
    "clsx": "^2.1.1",
    "jspdf": "^4.2.1",
    "lucide-react": "^1.24.0",
    "next": "16.2.10",
    "next-auth": "^5.0.0-beta.31",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.81.0",
    "tailwind-merge": "^3.6.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.10",
    "prisma": "^6.19.3",
    "tailwindcss": "^4",
    "tsx": "^4.23.0",
    "typescript": "^5",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Write `postcss.config.mjs`**

```javascript
const config = {
  plugins: { '@tailwindcss/postcss': {} },
}

export default config
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules
.next
.env
.env.local
.env.production
*.tsbuildinfo
dist
```

- [ ] **Step 6: Write `.env.example`**

```env
DATABASE_URL=postgresql://localhost:5432/foryoungs_billing
AUTH_SECRET=
NEXT_PUBLIC_COMPANY_DOMAIN=platform.jeneustech.com
```

- [ ] **Step 7: Write `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-navy: #1e3a5f;
  --color-teal: #0D9488;
  --color-dark: #060e1a;
  --color-dark-card: #0a1628;
  --color-gold: #d4af37;
}

body {
  background: var(--color-dark);
  color: #fff;
}
```

- [ ] **Step 8: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Foryoung's Billing",
  description: 'Bill Payment Platform — JENEUS CO LTD',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 9: Install dependencies and verify the app boots**

Run: `npm install`
Expected: installs without error.

Run: `npm run build`
Expected: `Compiled successfully` (there are no pages other than the root layout yet, so this mainly validates the toolchain).

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs .gitignore .env.example src/app/globals.css src/app/layout.tsx package-lock.json
git commit -m "chore: scaffold Next.js project with Tailwind v4 dark theme"
```

---

### Task 2: Prisma schema + local database

**Files:**
- Create: `prisma/schema.prisma`

**Interfaces:**
- Produces: Prisma Client models `User`, `Client`, `ClientService`, `Bill`, `WaterReading`, `ProviderCost`, `Payment`, `BillingSettings`, and enums `Role`, `ServiceType`, all importable from `@prisma/client`.

- [ ] **Step 1: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  CARETAKER
}

enum ServiceType {
  INTERNET
  WATER
  RENT
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
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

model ClientService {
  id       String      @id @default(uuid())
  clientId String
  client   Client      @relation(fields: [clientId], references: [id])
  type     ServiceType
  rate     Decimal?

  @@unique([clientId, type])
}

model Bill {
  id          String        @id @default(uuid())
  clientId    String
  client      Client        @relation(fields: [clientId], references: [id])
  serviceType ServiceType
  month       Int
  year        Int
  monthsCount Int           @default(1)
  amount      Decimal
  isPaid      Boolean       @default(false)
  paidDate    DateTime?
  createdAt   DateTime      @default(now())
  payment     Payment?
  reading     WaterReading?

  @@index([clientId, serviceType, year, month])
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
  defaultTaxShare Decimal  @default(0)
  readingDate     DateTime @default(now())
}

model ProviderCost {
  id          String      @id @default(uuid())
  serviceType ServiceType
  month       Int
  year        Int
  amount      Decimal
  notes       String?

  @@unique([serviceType, month, year])
}

model Payment {
  id          String   @id @default(uuid())
  billId      String   @unique
  bill        Bill     @relation(fields: [billId], references: [id])
  amountPaid  Decimal
  paymentDate DateTime @default(now())
  notes       String?
  recordedBy  String?
}

model BillingSettings {
  id        Int      @id @default(1)
  termsText String   @default("")
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Create the local database**

Run: `createdb foryoungs_billing` (or, if `createdb` isn't on PATH, connect with `psql -U postgres` and run `CREATE DATABASE foryoungs_billing;`)
Expected: database created with no error (or "already exists" if re-running).

- [ ] **Step 3: Copy `.env.example` to `.env` and generate an `AUTH_SECRET`**

Run: `cp .env.example .env` then fill `DATABASE_URL=postgresql://localhost:5432/foryoungs_billing` and generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, pasting the output as `AUTH_SECRET`.
Expected: `.env` has both values set (it's gitignored, so this stays local).

- [ ] **Step 4: Generate the Prisma client and push the schema**

Run: `npx prisma generate`
Expected: `Generated Prisma Client`.

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Prisma schema (User, Client, ClientService, Bill, WaterReading, ProviderCost, Payment, BillingSettings)"
```

---

### Task 3: Core lib utilities (Prisma client, cn(), shared types)

**Files:**
- Create: `src/lib/db/prisma.ts`, `src/lib/utils.ts`, `src/lib/types.ts`

**Interfaces:**
- Produces: `prisma` singleton (`src/lib/db/prisma.ts`), `cn(...inputs)` (`src/lib/utils.ts`), `ActionResult<T>` type (`src/lib/types.ts`) — used by every server action in every later task.

- [ ] **Step 1: Write `src/lib/db/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Write `src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtXaf(n: number | string): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' XAF'
}

export function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || ''
}
```

- [ ] **Step 3: Write `src/lib/types.ts`**

```typescript
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (only these three files exist under `src/lib` so far, plus the layout from Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/prisma.ts src/lib/utils.ts src/lib/types.ts
git commit -m "feat: add Prisma client singleton, cn() helper, ActionResult type"
```

---

### Task 4: Billing calculations (TDD)

This is the highest-risk area (money math) — write the tests first, per the spec's Testing section.

**Files:**
- Create: `src/features/billing/calculations.ts`, `src/features/billing/calculations.test.ts`

**Interfaces:**
- Produces: `computeWaterBill(currentReading, previousReading, activeWaterTenants): WaterBillBreakdown`, `computeInternetTotal(monthsCount): number`, `computeRentTotal(rate): number`, `findArrears(unpaidBills, targetMonth, targetYear): ArrearsSummary`, and types `WaterBillBreakdown`, `ArrearsBill`, `ArrearsSummary`. Consumed by Tasks 10, 11, 12 (Internet/Water/Rent actions).

- [ ] **Step 1: Write `vitest.config.ts` at the project root**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write the failing tests in `src/features/billing/calculations.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { computeWaterBill, computeInternetTotal, computeRentTotal, findArrears } from './calculations'

describe('computeWaterBill', () => {
  it('charges consumption at 700/unit plus flat fees when consumption > 0', () => {
    const result = computeWaterBill(120, 100, 5)
    expect(result.consumption).toBe(20)
    expect(result.consumptionCost).toBe(14000)
    expect(result.electricityFee).toBe(1000)
    expect(result.pumpServiceFee).toBe(2000)
    expect(result.defaultTaxShare).toBe(0)
    expect(result.total).toBe(17000)
  })

  it('splits the 930 default tax share across active water tenants when consumption is zero', () => {
    const result = computeWaterBill(100, 100, 3)
    expect(result.consumption).toBe(0)
    expect(result.consumptionCost).toBe(0)
    expect(result.defaultTaxShare).toBe(310) // round(930 / 3)
    expect(result.total).toBe(3310) // 310 + 1000 + 2000
  })

  it('rounds the default tax share when it does not divide evenly', () => {
    const result = computeWaterBill(50, 50, 4)
    expect(result.defaultTaxShare).toBe(233) // round(930 / 4) = round(232.5) = 233
    expect(result.total).toBe(3233)
  })

  it('charges the full 930 when there are no active water tenants', () => {
    const result = computeWaterBill(10, 10, 0)
    expect(result.defaultTaxShare).toBe(930)
    expect(result.total).toBe(3930)
  })

  it('never returns negative consumption when current < previous', () => {
    const result = computeWaterBill(90, 100, 5)
    expect(result.consumption).toBe(0)
    expect(result.defaultTaxShare).toBe(186) // round(930/5)
  })
})

describe('computeInternetTotal', () => {
  it('charges 10,000 per month', () => {
    expect(computeInternetTotal(1)).toBe(10000)
  })

  it('multiplies by monthsCount for consolidated arrears billing', () => {
    expect(computeInternetTotal(3)).toBe(30000)
  })
})

describe('computeRentTotal', () => {
  it('returns the client service rate as-is', () => {
    expect(computeRentTotal(140000)).toBe(140000)
  })
})

describe('findArrears', () => {
  const bills = [
    { id: 'a', month: 3, year: 2026, monthsCount: 1, amount: 10000 },
    { id: 'b', month: 5, year: 2026, monthsCount: 1, amount: 10000 },
    { id: 'c', month: 7, year: 2026, monthsCount: 1, amount: 10000 }, // same month as target — not arrears
    { id: 'd', month: 1, year: 2025, monthsCount: 2, amount: 20000 },
  ]

  it('returns only bills strictly before the target month/year, oldest first', () => {
    const result = findArrears(bills, 7, 2026)
    expect(result.bills.map(b => b.id)).toEqual(['d', 'a', 'b'])
  })

  it('sums monthsCount and amount across the arrears', () => {
    const result = findArrears(bills, 7, 2026)
    expect(result.totalMonths).toBe(4) // 2 + 1 + 1
    expect(result.totalAmount).toBe(40000) // 20000 + 10000 + 10000
  })

  it('returns an empty summary when there are no prior unpaid bills', () => {
    const result = findArrears([], 1, 2026)
    expect(result.bills).toEqual([])
    expect(result.totalMonths).toBe(0)
    expect(result.totalAmount).toBe(0)
  })
})
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `npx vitest run src/features/billing/calculations.test.ts`
Expected: FAIL — `Cannot find module './calculations'` (the file doesn't exist yet).

- [ ] **Step 4: Write `src/features/billing/calculations.ts`**

```typescript
export interface WaterBillBreakdown {
  consumption: number
  consumptionCost: number
  electricityFee: number
  pumpServiceFee: number
  defaultTaxShare: number
  total: number
}

const ELECTRICITY_FEE = 1000
const PUMP_SERVICE_FEE = 2000
const CONSUMPTION_RATE = 700
const DEFAULT_TAX_BASE = 930 // 780 base + 150 surcharge, split across active water tenants

export function computeWaterBill(
  currentReading: number,
  previousReading: number,
  activeWaterTenants: number,
): WaterBillBreakdown {
  const consumption = Math.max(0, currentReading - previousReading)

  if (consumption === 0) {
    const defaultTaxShare =
      activeWaterTenants > 0 ? Math.round(DEFAULT_TAX_BASE / activeWaterTenants) : DEFAULT_TAX_BASE
    return {
      consumption: 0,
      consumptionCost: 0,
      electricityFee: ELECTRICITY_FEE,
      pumpServiceFee: PUMP_SERVICE_FEE,
      defaultTaxShare,
      total: defaultTaxShare + ELECTRICITY_FEE + PUMP_SERVICE_FEE,
    }
  }

  const consumptionCost = consumption * CONSUMPTION_RATE
  return {
    consumption,
    consumptionCost,
    electricityFee: ELECTRICITY_FEE,
    pumpServiceFee: PUMP_SERVICE_FEE,
    defaultTaxShare: 0,
    total: consumptionCost + ELECTRICITY_FEE + PUMP_SERVICE_FEE,
  }
}

export function computeInternetTotal(monthsCount: number): number {
  return 10000 * monthsCount
}

export function computeRentTotal(rate: number): number {
  return rate
}

export interface ArrearsBill {
  id: string
  month: number
  year: number
  monthsCount: number
  amount: number
}

export interface ArrearsSummary {
  bills: ArrearsBill[]
  totalMonths: number
  totalAmount: number
}

export function findArrears(
  unpaidBills: ArrearsBill[],
  targetMonth: number,
  targetYear: number,
): ArrearsSummary {
  const prior = unpaidBills
    .filter(b => b.year < targetYear || (b.year === targetYear && b.month < targetMonth))
    .sort((a, b) => a.year - b.year || a.month - b.month)

  return {
    bills: prior,
    totalMonths: prior.reduce((s, b) => s + (b.monthsCount || 1), 0),
    totalAmount: prior.reduce((s, b) => s + b.amount, 0),
  }
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npx vitest run src/features/billing/calculations.test.ts`
Expected: PASS — all 10 tests green.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/features/billing/calculations.ts src/features/billing/calculations.test.ts
git commit -m "feat: add billing calculators for water/internet/rent/arrears with tests"
```

---

### Task 5: Auth (NextAuth config, permissions, login)

**Files:**
- Create: `src/lib/auth/config.ts`, `src/lib/auth/index.ts`, `src/lib/auth/permissions.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/login/page.tsx`, `src/features/auth/LoginForm.tsx`

**Interfaces:**
- Consumes: `prisma` from Task 3.
- Produces: `auth()`, `signIn()`, `signOut()`, `handlers` (from `src/lib/auth/index.ts`), `requireAdmin(session)` (from `src/lib/auth/permissions.ts`) — consumed by every dashboard page/action in later tasks. `session.user` is typed with `id: string` and `role: 'ADMIN' | 'CARETAKER'`.

- [ ] **Step 1: Write `src/lib/auth/config.ts`**

No `PrismaAdapter` — Credentials-only auth with JWT sessions doesn't need OAuth account linking or DB sessions, so the adapter and its tables are skipped entirely (YAGNI, per the spec's simplified-auth decision).

```typescript
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.active) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id: string }).id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
      }
      return session
    },
  },
}
```

- [ ] **Step 2: Write `src/lib/auth/index.ts`**

```typescript
import NextAuth from 'next-auth'
import { authConfig } from './config'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

- [ ] **Step 3: Write `src/lib/auth/permissions.ts`**

```typescript
import type { Session } from 'next-auth'

export function requireAdmin(session: Session | null): boolean {
  return (session?.user as { role?: string } | undefined)?.role === 'ADMIN'
}
```

- [ ] **Step 4: Write `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 5: Write `src/features/auth/LoginForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-dark-card p-8">
      <h1 className="text-xl font-bold text-white">Foryoung&apos;s Billing</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <label className="mb-1 block text-sm text-white/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-teal px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Write `src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from '@/features/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dark px-4">
      <LoginForm />
    </main>
  )
}
```

- [ ] **Step 7: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth src/app/api/auth src/app/\(auth\) src/features/auth
git commit -m "feat: add NextAuth Credentials auth with ADMIN/CARETAKER roles"
```

---

### Task 6: Seed script (initial users)

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3), `Role` enum (Task 2).
- Produces: an ADMIN and a CARETAKER user in the database, printed credentials for first login.

- [ ] **Step 1: Write `prisma/seed.ts`**

```typescript
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
```

- [ ] **Step 2: Run the seed and verify**

Run: `npx prisma db seed`
Expected: prints both seeded accounts, exits 0.

Run: `npx prisma studio` (optional manual check), confirm two rows in `User` table, then close it.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add seed script for ADMIN/CARETAKER users and default billing settings"
```

---

### Task 7: UI component library

**Files:**
- Create: `src/lib/ui/Button.tsx`, `src/lib/ui/Card.tsx`, `src/lib/ui/Input.tsx`, `src/lib/ui/Badge.tsx`, `src/lib/ui/Modal.tsx`, `src/lib/ui/SlideOver.tsx`, `src/lib/ui/index.ts`

**Interfaces:**
- Consumes: `cn()` from Task 3.
- Produces: `Button`, `Card`, `Input`, `Textarea`, `Badge`, `Modal`, `SlideOver` — consumed by every feature module's List/Form components in later tasks.

- [ ] **Step 1: Write `src/lib/ui/Button.tsx`**

```tsx
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-teal text-white hover:bg-teal/90',
  ghost: 'bg-transparent text-white/80 hover:bg-white/10',
  danger: 'bg-red-600 text-white hover:bg-red-500',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Write `src/lib/ui/Card.tsx`**

```tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-teal/20 bg-dark-card p-5', className)}>
      {title && <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>}
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/lib/ui/Input.tsx`**

```tsx
import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref,
) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm text-white/70">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-white/30',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm text-white/70">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white placeholder:text-white/30',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
})
```

- [ ] **Step 4: Write `src/lib/ui/Badge.tsx`**

```tsx
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Color = 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'grey'

const colorClasses: Record<Color, string> = {
  red: 'bg-red-500/15 text-red-400',
  amber: 'bg-amber-500/15 text-amber-400',
  blue: 'bg-blue-500/15 text-blue-400',
  green: 'bg-green-500/15 text-green-400',
  purple: 'bg-purple-500/15 text-purple-400',
  grey: 'bg-white/10 text-white/60',
}

export function Badge({ color, children }: { color: Color; children: ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', colorClasses[color])}>
      {children}
    </span>
  )
}
```

- [ ] **Step 5: Write `src/lib/ui/Modal.tsx`**

```tsx
'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  size?: Size
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, size = 'md', title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={cn('w-full rounded-lg border border-white/10 bg-dark-card p-6', sizeClasses[size])}
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `src/lib/ui/SlideOver.tsx`**

```tsx
'use client'

import type { ReactNode } from 'react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function SlideOver({ open, onClose, title, children }: SlideOverProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-dark-card p-6"
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write `src/lib/ui/index.ts`**

```typescript
export { Button } from './Button'
export { Card } from './Card'
export { Input, Textarea } from './Input'
export { Badge } from './Badge'
export { Modal } from './Modal'
export { SlideOver } from './SlideOver'
```

- [ ] **Step 8: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ui
git commit -m "feat: add dark-theme UI component library (Button, Card, Input, Badge, Modal, SlideOver)"
```

---

### Task 8: Dashboard shell (Sidebar, Header, MobileNav, layout guard)

**Files:**
- Create: `src/features/shell/DashboardShell.tsx`, `src/features/shell/Sidebar.tsx`, `src/features/shell/Header.tsx`, `src/features/shell/MobileNav.tsx`, `src/app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `auth()` (Task 5), `requireAdmin()` (Task 5).
- Produces: `DashboardShell` wrapping every `/dashboard/*` page; sidebar hides "Reports" and "Terms" for CARETAKER sessions.

- [ ] **Step 1: Write `src/features/shell/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', adminOnly: false },
  { href: '/dashboard/clients', label: 'Clients', adminOnly: false },
  { href: '/dashboard/internet-bills', label: 'Internet Bills', adminOnly: false },
  { href: '/dashboard/water-bills', label: 'Water Bills', adminOnly: false },
  { href: '/dashboard/rent-bills', label: 'Rent Bills', adminOnly: false },
  { href: '/dashboard/payments', label: 'Payments', adminOnly: false },
  { href: '/dashboard/reports', label: 'Reports', adminOnly: true },
  { href: '/dashboard/terms', label: 'Terms', adminOnly: true },
]

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="hidden w-56 flex-col gap-1 border-r border-white/10 bg-dark-card p-4 md:flex">
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded px-3 py-2 text-sm text-white/70 hover:bg-navy hover:text-white',
            pathname === item.href && 'bg-navy font-semibold text-white',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Write `src/features/shell/Header.tsx`**

```tsx
'use client'

import { signOut } from 'next-auth/react'

export function Header({ userName }: { userName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-dark-card px-4 py-3">
      <span className="font-semibold text-white">Foryoung&apos;s Billing</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">{userName}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-white/50 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Write `src/features/shell/MobileNav.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/clients', label: 'Clients' },
  { href: '/dashboard/payments', label: 'Payments' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-white/10 bg-dark-card py-2 md:hidden">
      {ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn('text-xs text-white/60', pathname === item.href && 'font-semibold text-teal')}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Write `src/features/shell/DashboardShell.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface DashboardShellProps {
  userName: string
  isAdmin: boolean
  children: ReactNode
}

export function DashboardShell({ userName, isAdmin, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <Header userName={userName} />
        <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write `src/app/dashboard/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardShell } from '@/features/shell/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = (session.user as { role?: string }).role === 'ADMIN'
  const userName = session.user.name || session.user.email || 'User'

  return (
    <DashboardShell userName={userName} isAdmin={isAdmin}>
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (there's no `/dashboard/page.tsx` yet — that lands in Task 15 — so this only validates the layout and shell components).

- [ ] **Step 7: Commit**

```bash
git add src/features/shell src/app/dashboard/layout.tsx
git commit -m "feat: add dashboard shell with RBAC-aware sidebar nav"
```

---

### Task 9: Clients module

**Files:**
- Create: `src/features/clients/types.ts`, `src/features/clients/actions.ts`, `src/features/clients/ClientList.tsx`, `src/features/clients/ClientForm.tsx`, `src/app/dashboard/clients/page.tsx`

**Interfaces:**
- Consumes: `prisma`, `auth()`, `ActionResult`, `Button`/`Card`/`Input`/`Badge`/`SlideOver`.
- Produces: `getClients()`, `getClientsForDropdown(serviceType?)`, `saveClient(input)`, `toggleClientActive(id)` — consumed by Internet/Water/Rent modules (Tasks 10–12) for client dropdowns.

- [ ] **Step 1: Write `src/features/clients/types.ts`**

```typescript
import type { ServiceType } from '@prisma/client'

export interface ClientFormInput {
  id?: string
  name: string
  phone: string
  email?: string
  unit?: string
  isActive: boolean
  notes?: string
  services: { type: ServiceType; rate?: number }[]
}

export interface ClientWithServices {
  id: string
  name: string
  phone: string
  email: string | null
  unit: string | null
  isActive: boolean
  notes: string | null
  services: { type: ServiceType; rate: number | null }[]
}
```

- [ ] **Step 2: Write `src/features/clients/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'
import type { ClientFormInput, ClientWithServices } from './types'

export async function getClients(): Promise<ClientWithServices[]> {
  const clients = await prisma.client.findMany({
    include: { services: true },
    orderBy: { name: 'asc' },
  })
  return clients.map(c => ({
    ...c,
    services: c.services.map(s => ({ type: s.type, rate: s.rate ? Number(s.rate) : null })),
  }))
}

export async function getClientsForDropdown(serviceType?: ServiceType) {
  const clients = await prisma.client.findMany({
    where: {
      isActive: true,
      ...(serviceType ? { services: { some: { type: serviceType } } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return clients
}

export async function saveClient(input: ClientFormInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (!input.name.trim() || !input.phone.trim()) return { success: false, error: 'Name and phone are required.' }

  const data = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    unit: input.unit?.trim() || null,
    isActive: input.isActive,
    notes: input.notes?.trim() || null,
  }

  const client = input.id
    ? await prisma.client.update({ where: { id: input.id }, data })
    : await prisma.client.create({ data })

  await prisma.clientService.deleteMany({ where: { clientId: client.id } })
  if (input.services.length > 0) {
    await prisma.clientService.createMany({
      data: input.services.map(s => ({ clientId: client.id, type: s.type, rate: s.rate ?? null })),
    })
  }

  revalidatePath('/dashboard/clients')
  return { success: true, data: { id: client.id } }
}

export async function toggleClientActive(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return { success: false, error: 'Client not found' }

  await prisma.client.update({ where: { id }, data: { isActive: !client.isActive } })
  revalidatePath('/dashboard/clients')
  return { success: true, data: undefined }
}
```

- [ ] **Step 3: Write `src/features/clients/ClientForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { SlideOver, Button, Input } from '@/lib/ui'
import { saveClient } from './actions'
import type { ClientWithServices } from './types'
import type { ServiceType } from '@prisma/client'

interface ClientFormProps {
  open: boolean
  onClose: () => void
  editing: ClientWithServices | null
}

export function ClientForm({ open, onClose, editing }: ClientFormProps) {
  const [name, setName] = useState(editing?.name ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [email, setEmail] = useState(editing?.email ?? '')
  const [unit, setUnit] = useState(editing?.unit ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [isActive, setIsActive] = useState(editing?.isActive ?? true)
  const [hasInternet, setHasInternet] = useState(!!editing?.services.find(s => s.type === 'INTERNET'))
  const [hasWater, setHasWater] = useState(!!editing?.services.find(s => s.type === 'WATER'))
  const [hasRent, setHasRent] = useState(!!editing?.services.find(s => s.type === 'RENT'))
  const [rentAmount, setRentAmount] = useState(editing?.services.find(s => s.type === 'RENT')?.rate ?? 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const services: { type: ServiceType; rate?: number }[] = []
    if (hasInternet) services.push({ type: 'INTERNET', rate: 10000 })
    if (hasWater) services.push({ type: 'WATER' })
    if (hasRent) services.push({ type: 'RENT', rate: rentAmount })

    const result = await saveClient({
      id: editing?.id,
      name,
      phone,
      email,
      unit,
      notes,
      isActive,
      services,
    })

    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <SlideOver open={open} onClose={onClose} title={editing ? 'Edit Client' : 'Add Client'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Unit / Apartment" value={unit} onChange={e => setUnit(e.target.value)} />

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={hasInternet} onChange={e => setHasInternet(e.target.checked)} />
            Internet (10,000 XAF/month)
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={hasWater} onChange={e => setHasWater(e.target.checked)} />
            Water
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={hasRent} onChange={e => setHasRent(e.target.checked)} />
            Rent
          </label>
          {hasRent && (
            <Input
              label="Rent amount (XAF/month)"
              type="number"
              value={rentAmount}
              onChange={e => setRentAmount(Number(e.target.value))}
            />
          )}
        </div>

        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </SlideOver>
  )
}
```

- [ ] **Step 4: Write `src/features/clients/ClientList.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Card, Button, Badge } from '@/lib/ui'
import { toggleClientActive } from './actions'
import { ClientForm } from './ClientForm'
import type { ClientWithServices } from './types'

export function ClientList({ clients }: { clients: ClientWithServices[] }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ClientWithServices | null>(null)

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(client: ClientWithServices) {
    setEditing(client)
    setFormOpen(true)
  }

  return (
    <Card title="Clients">
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}>+ Add Client</Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Name</th>
            <th className="pb-2">Phone</th>
            <th className="pb-2">Services</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.id} className="border-t border-white/10">
              <td className="py-2 text-white">{c.name}</td>
              <td className="py-2 text-white/70">{c.phone}</td>
              <td className="py-2 text-white/70">{c.services.map(s => s.type).join(', ') || '—'}</td>
              <td className="py-2">
                <Badge color={c.isActive ? 'green' : 'grey'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
              </td>
              <td className="py-2 space-x-2">
                <button className="text-teal hover:underline" onClick={() => openEdit(c)}>
                  Edit
                </button>
                <button className="text-white/50 hover:underline" onClick={() => toggleClientActive(c.id)}>
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ClientForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
    </Card>
  )
}
```

- [ ] **Step 5: Write `src/app/dashboard/clients/page.tsx`**

```tsx
import { getClients } from '@/features/clients/actions'
import { ClientList } from '@/features/clients/ClientList'

export default async function ClientsPage() {
  const clients = await getClients()
  return <ClientList clients={clients} />
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/clients src/app/dashboard/clients
git commit -m "feat: add Clients module (CRUD, service subscriptions)"
```

---

### Task 10: Internet Bills module

**Files:**
- Create: `src/features/internet/actions.ts`, `src/features/internet/InternetBillForm.tsx`, `src/features/internet/InternetBillList.tsx`, `src/app/dashboard/internet-bills/page.tsx`

**Interfaces:**
- Consumes: `computeInternetTotal`, `findArrears` (Task 4), `getClientsForDropdown` (Task 9), `prisma`, `auth()`, `fmtXaf`/`monthName` (Task 3).
- Produces: `getInternetBills()`, `checkInternetArrears(clientId, month, year)`, `generateInternetBill(input)`.

- [ ] **Step 1: Write `src/features/internet/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeInternetTotal, findArrears, type ArrearsSummary } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getInternetBills() {
  return prisma.bill.findMany({
    where: { serviceType: 'INTERNET' },
    include: { client: { select: { name: true } }, payment: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
}

export async function checkInternetArrears(clientId: string, month: number, year: number): Promise<ArrearsSummary> {
  const unpaid = await prisma.bill.findMany({
    where: { clientId, serviceType: 'INTERNET', isPaid: false },
  })
  return findArrears(
    unpaid.map(b => ({ id: b.id, month: b.month, year: b.year, monthsCount: b.monthsCount, amount: Number(b.amount) })),
    month,
    year,
  )
}

interface GenerateInternetBillInput {
  clientId: string
  month: number
  year: number
  monthsCount: number
}

export async function generateInternetBill(input: GenerateInternetBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const client = await prisma.client.findUnique({ where: { id: input.clientId } })
  if (!client || !client.isActive) return { success: false, error: 'Client is not active.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'INTERNET', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const amount = computeInternetTotal(input.monthsCount)
  const bill = await prisma.bill.create({
    data: {
      clientId: input.clientId,
      serviceType: 'INTERNET',
      month: input.month,
      year: input.year,
      monthsCount: input.monthsCount,
      amount,
    },
  })

  revalidatePath('/dashboard/internet-bills')
  return { success: true, data: { id: bill.id } }
}
```

- [ ] **Step 2: Write `src/features/internet/InternetBillForm.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { checkInternetArrears, generateInternetBill } from './actions'
import { computeInternetTotal } from '@/features/billing/calculations'
import { fmtXaf, monthName } from '@/lib/utils'
import type { ArrearsSummary } from '@/features/billing/calculations'

export function InternetBillForm() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [arrears, setArrears] = useState<ArrearsSummary | null>(null)
  const [consolidate, setConsolidate] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('INTERNET').then(setClients)
  }, [])

  useEffect(() => {
    if (!clientId) {
      setArrears(null)
      return
    }
    checkInternetArrears(clientId, month, year).then(a => setArrears(a.bills.length > 0 ? a : null))
  }, [clientId, month, year])

  const monthsCount = consolidate && arrears ? arrears.totalMonths + 1 : 1
  const total = computeInternetTotal(monthsCount)

  async function handleGenerate() {
    setMessage('')
    const result = await generateInternetBill({ clientId, month, year, monthsCount })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Generate Internet Bill">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-white/70">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {arrears && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            {arrears.totalMonths} unpaid month{arrears.totalMonths > 1 ? 's' : ''} (
            {arrears.bills.map(b => `${monthName(b.month)} ${b.year}`).join(', ')}) totaling {fmtXaf(arrears.totalAmount)}.
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={consolidate} onChange={e => setConsolidate(e.target.checked)} />
              Consolidate into this bill
            </label>
          </div>
        )}

        <p className="text-sm text-white/70">
          Total: <span className="font-semibold text-white">{fmtXaf(total)}</span> ({monthsCount} month
          {monthsCount > 1 ? 's' : ''})
        </p>

        {message && <p className="text-sm text-teal">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Write `src/features/internet/InternetBillList.tsx`**

```tsx
import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getInternetBills } from './actions'

export async function InternetBillList() {
  const bills = await getInternetBills()
  return (
    <Card title="Internet Bills">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
                {b.monthsCount > 1 ? ` (${b.monthsCount} months)` : ''}
              </td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
```

- [ ] **Step 4: Write `src/app/dashboard/internet-bills/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/internet src/app/dashboard/internet-bills
git commit -m "feat: add Internet Bills module with arrears consolidation"
```

---

### Task 11: Water Bills module

**Files:**
- Create: `src/features/water/actions.ts`, `src/features/water/WaterReadingForm.tsx`, `src/features/water/WaterBillList.tsx`, `src/app/dashboard/water-bills/page.tsx`

**Interfaces:**
- Consumes: `computeWaterBill` (Task 4), `getClientsForDropdown` (Task 9).
- Produces: `getWaterBills()`, `getPreviousReading(clientId)`, `previewWaterBill(clientId, currentReading)`, `generateWaterBill(input)`.

- [ ] **Step 1: Write `src/features/water/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeWaterBill, type WaterBillBreakdown } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getWaterBills() {
  return prisma.bill.findMany({
    where: { serviceType: 'WATER' },
    include: { client: { select: { name: true } }, reading: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
}

export async function getPreviousReading(clientId: string): Promise<number | null> {
  const last = await prisma.waterReading.findFirst({
    where: { clientId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return last ? Number(last.currentReading) : null
}

async function countActiveWaterTenants(): Promise<number> {
  return prisma.client.count({
    where: { isActive: true, services: { some: { type: 'WATER' } } },
  })
}

export async function previewWaterBill(
  currentReading: number,
  previousReading: number,
): Promise<ActionResult<WaterBillBreakdown>> {
  if (currentReading < previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }
  const tenants = await countActiveWaterTenants()
  return { success: true, data: computeWaterBill(currentReading, previousReading, tenants) }
}

interface GenerateWaterBillInput {
  clientId: string
  month: number
  year: number
  currentReading: number
  previousReading: number
}

export async function generateWaterBill(input: GenerateWaterBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  if (input.currentReading < input.previousReading) {
    return { success: false, error: 'Current reading cannot be less than the previous reading.' }
  }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'WATER', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const tenants = await countActiveWaterTenants()
  const breakdown = computeWaterBill(input.currentReading, input.previousReading, tenants)

  const bill = await prisma.bill.create({
    data: {
      clientId: input.clientId,
      serviceType: 'WATER',
      month: input.month,
      year: input.year,
      amount: breakdown.total,
      reading: {
        create: {
          clientId: input.clientId,
          month: input.month,
          year: input.year,
          previousReading: input.previousReading,
          currentReading: input.currentReading,
          consumption: breakdown.consumption,
          consumptionCost: breakdown.consumptionCost,
          electricityFee: breakdown.electricityFee,
          pumpServiceFee: breakdown.pumpServiceFee,
          defaultTaxShare: breakdown.defaultTaxShare,
        },
      },
    },
  })

  revalidatePath('/dashboard/water-bills')
  return { success: true, data: { id: bill.id } }
}
```

- [ ] **Step 2: Write `src/features/water/WaterReadingForm.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { getPreviousReading, previewWaterBill, generateWaterBill } from './actions'
import { fmtXaf } from '@/lib/utils'
import type { WaterBillBreakdown } from '@/features/billing/calculations'

export function WaterReadingForm() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [previousReading, setPreviousReading] = useState<number | null>(null)
  const [manualPrevious, setManualPrevious] = useState(0)
  const [currentReading, setCurrentReading] = useState(0)
  const [breakdown, setBreakdown] = useState<WaterBillBreakdown | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('WATER').then(setClients)
  }, [])

  useEffect(() => {
    if (!clientId) {
      setPreviousReading(null)
      return
    }
    getPreviousReading(clientId).then(setPreviousReading)
  }, [clientId])

  const effectivePrevious = previousReading ?? manualPrevious

  useEffect(() => {
    if (!clientId || currentReading <= 0) {
      setBreakdown(null)
      return
    }
    previewWaterBill(currentReading, effectivePrevious).then(result => {
      setBreakdown(result.success ? result.data : null)
    })
  }, [clientId, currentReading, effectivePrevious])

  async function handleGenerate() {
    setMessage('')
    const result = await generateWaterBill({
      clientId,
      month,
      year,
      currentReading,
      previousReading: effectivePrevious,
    })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Enter Water Meter Reading">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-white/70">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {clientId && previousReading === null && (
          <Input
            label="Previous reading (no prior reading on file — enter manually)"
            type="number"
            value={manualPrevious}
            onChange={e => setManualPrevious(Number(e.target.value))}
          />
        )}
        {clientId && previousReading !== null && (
          <p className="text-sm text-white/70">Previous reading: {previousReading.toFixed(1)} m³</p>
        )}

        <Input
          label="Current reading"
          type="number"
          value={currentReading}
          onChange={e => setCurrentReading(Number(e.target.value))}
        />

        {breakdown && (
          <div className="space-y-1 rounded border border-white/10 bg-black/20 p-3 text-sm text-white/80">
            <div className="flex justify-between">
              <span>Consumption</span>
              <span>{breakdown.consumption} m³</span>
            </div>
            {breakdown.consumption === 0 ? (
              <div className="flex justify-between">
                <span>Default tax share (930 split across active water tenants)</span>
                <span>{fmtXaf(breakdown.defaultTaxShare)}</span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span>Consumption cost (@ 700 F/m³)</span>
                <span>{fmtXaf(breakdown.consumptionCost)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Electricity fee</span>
              <span>{fmtXaf(breakdown.electricityFee)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pump service fee</span>
              <span>{fmtXaf(breakdown.pumpServiceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
              <span>Total</span>
              <span>{fmtXaf(breakdown.total)}</span>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-teal">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId || !breakdown}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Write `src/features/water/WaterBillList.tsx`**

```tsx
import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getWaterBills } from './actions'

export async function WaterBillList() {
  const bills = await getWaterBills()
  return (
    <Card title="Water Bills">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Consumption</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-white/70">{b.reading ? `${Number(b.reading.consumption)} m³` : '—'}</td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
```

- [ ] **Step 4: Write `src/app/dashboard/water-bills/page.tsx`**

```tsx
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
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/water src/app/dashboard/water-bills
git commit -m "feat: add Water Bills module with live breakdown preview"
```

---

### Task 12: Rent Bills module

**Files:**
- Create: `src/features/rent/actions.ts`, `src/features/rent/RentBillForm.tsx`, `src/features/rent/RentBillList.tsx`, `src/app/dashboard/rent-bills/page.tsx`

**Interfaces:**
- Consumes: `computeRentTotal` (Task 4), `getClientsForDropdown` (Task 9).
- Produces: `getRentBills()`, `generateRentBill(input)`.

- [ ] **Step 1: Write `src/features/rent/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { computeRentTotal } from '@/features/billing/calculations'
import type { ActionResult } from '@/lib/types'

export async function getRentBills() {
  return prisma.bill.findMany({
    where: { serviceType: 'RENT' },
    include: { client: { select: { name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
}

interface GenerateRentBillInput {
  clientId: string
  month: number
  year: number
}

export async function generateRentBill(input: GenerateRentBillInput): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const service = await prisma.clientService.findUnique({
    where: { clientId_type: { clientId: input.clientId, type: 'RENT' } },
  })
  if (!service || service.rate === null) return { success: false, error: 'Client has no rent rate configured.' }

  const existing = await prisma.bill.findFirst({
    where: { clientId: input.clientId, serviceType: 'RENT', month: input.month, year: input.year },
  })
  if (existing) return { success: false, error: 'A bill already exists for this client and period.' }

  const amount = computeRentTotal(Number(service.rate))
  const bill = await prisma.bill.create({
    data: { clientId: input.clientId, serviceType: 'RENT', month: input.month, year: input.year, amount },
  })

  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: { id: bill.id } }
}
```

- [ ] **Step 2: Write `src/features/rent/RentBillForm.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Input } from '@/lib/ui'
import { getClientsForDropdown } from '@/features/clients/actions'
import { generateRentBill } from './actions'

export function RentBillForm() {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [message, setMessage] = useState('')

  useEffect(() => {
    getClientsForDropdown('RENT').then(setClients)
  }, [])

  async function handleGenerate() {
    setMessage('')
    const result = await generateRentBill({ clientId, month, year })
    setMessage(result.success ? 'Bill generated.' : result.error)
  }

  return (
    <Card title="Generate Rent Bill">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm text-white/70">Client</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
          >
            <option value="">Select client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>
        {message && <p className="text-sm text-teal">{message}</p>}
        <Button onClick={handleGenerate} disabled={!clientId}>
          Generate Bill
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Write `src/features/rent/RentBillList.tsx`**

```tsx
import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getRentBills } from './actions'

export async function RentBillList() {
  const bills = await getRentBills()
  return (
    <Card title="Rent Bills">
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Badge color={b.isPaid ? 'green' : 'amber'}>{b.isPaid ? 'Paid' : 'Unpaid'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
```

- [ ] **Step 4: Write `src/app/dashboard/rent-bills/page.tsx`**

```tsx
import { RentBillForm } from '@/features/rent/RentBillForm'
import { RentBillList } from '@/features/rent/RentBillList'

export default function RentBillsPage() {
  return (
    <div className="space-y-6">
      <RentBillForm />
      <RentBillList />
    </div>
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/rent src/app/dashboard/rent-bills
git commit -m "feat: add Rent Bills module"
```

---

### Task 13: Receipt PDF generator

**Files:**
- Create: `src/features/receipts/ReceiptPDF.ts`

**Interfaces:**
- Produces: `generateReceiptPDF(data: ReceiptData): void` — consumed by Task 14 (Payments module).

- [ ] **Step 1: Write `src/features/receipts/ReceiptPDF.ts`**

Direct jsPDF vector drawing — same technique as support-platform's fixed `InvoicePDF.tsx`, deliberately avoiding `window.print()`/html2canvas.

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/receipts
git commit -m "feat: add jsPDF vector receipt generator"
```

---

### Task 14: Payments module

**Files:**
- Create: `src/features/payments/actions.ts`, `src/features/payments/PaymentList.tsx`, `src/app/dashboard/payments/page.tsx`

**Interfaces:**
- Consumes: `generateReceiptPDF` (Task 13).
- Produces: `getPayments(filters)`, `markBillPaid(billId, paymentDate, notes?)`.

- [ ] **Step 1: Write `src/features/payments/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ServiceType } from '@prisma/client'
import type { ActionResult } from '@/lib/types'

interface PaymentFilters {
  month?: number
  year?: number
  serviceType?: ServiceType
}

export async function getPayments(filters: PaymentFilters) {
  return prisma.bill.findMany({
    where: {
      isPaid: true,
      ...(filters.month ? { month: filters.month } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.serviceType ? { serviceType: filters.serviceType } : {}),
    },
    include: { client: { select: { name: true, phone: true } }, payment: true },
    orderBy: { paidDate: 'desc' },
  })
}

export async function getUnpaidBills() {
  return prisma.bill.findMany({
    where: { isPaid: false },
    include: { client: { select: { name: true } } },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })
}

export async function markBillPaid(billId: string, paymentDate: string, notes?: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return { success: false, error: 'Bill not found' }
  if (bill.isPaid) return { success: false, error: 'Bill is already marked as paid' }

  const paidDateObj = new Date(paymentDate)
  await prisma.bill.update({ where: { id: billId }, data: { isPaid: true, paidDate: paidDateObj } })
  await prisma.payment.create({
    data: {
      billId,
      amountPaid: bill.amount,
      paymentDate: paidDateObj,
      notes,
      recordedBy: (session.user as { id: string }).id,
    },
  })

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/internet-bills')
  revalidatePath('/dashboard/water-bills')
  revalidatePath('/dashboard/rent-bills')
  return { success: true, data: undefined }
}
```

- [ ] **Step 2: Write `src/features/payments/PaymentList.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getUnpaidBills, markBillPaid } from './actions'
import { generateReceiptPDF } from '@/features/receipts/ReceiptPDF'

interface UnpaidBill {
  id: string
  clientId: string
  serviceType: 'INTERNET' | 'WATER' | 'RENT'
  month: number
  year: number
  amount: unknown
  client: { name: string }
}

export function PaymentList() {
  const [bills, setBills] = useState<UnpaidBill[]>([])
  const [message, setMessage] = useState('')

  async function refresh() {
    const data = await getUnpaidBills()
    setBills(
      data.map(b => ({
        id: b.id,
        clientId: b.clientId,
        serviceType: b.serviceType,
        month: b.month,
        year: b.year,
        amount: b.amount,
        client: b.client,
      })),
    )
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleMarkPaid(bill: UnpaidBill) {
    setMessage('')
    const today = new Date().toISOString().slice(0, 10)
    const result = await markBillPaid(bill.id, today)
    if (!result.success) {
      setMessage(result.error)
      return
    }
    generateReceiptPDF({
      receiptNumber: `${bill.id.slice(0, 8).toUpperCase()}`,
      clientName: bill.client.name,
      clientPhone: '',
      serviceType: bill.serviceType,
      periodLabel: `${monthName(bill.month)} ${bill.year}`,
      amount: Number(bill.amount),
      paidDate: today,
    })
    refresh()
  }

  return (
    <Card title="Unpaid Bills">
      {message && <p className="mb-2 text-sm text-red-400">{message}</p>}
      <table className="w-full text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="pb-2">Client</th>
            <th className="pb-2">Service</th>
            <th className="pb-2">Period</th>
            <th className="pb-2">Amount</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(b => (
            <tr key={b.id} className="border-t border-white/10">
              <td className="py-2 text-white">{b.client.name}</td>
              <td className="py-2">
                <Badge color="blue">{b.serviceType}</Badge>
              </td>
              <td className="py-2 text-white/70">
                {monthName(b.month)} {b.year}
              </td>
              <td className="py-2 text-white/70">{fmtXaf(Number(b.amount))}</td>
              <td className="py-2">
                <Button size="sm" onClick={() => handleMarkPaid(b)}>
                  Mark Paid + Receipt
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-white/40">
                No unpaid bills.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
```

- [ ] **Step 3: Write `src/app/dashboard/payments/page.tsx`**

```tsx
import { PaymentList } from '@/features/payments/PaymentList'

export default function PaymentsPage() {
  return <PaymentList />
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/payments src/app/dashboard/payments
git commit -m "feat: add Payments module with mark-as-paid and receipt generation"
```

---

### Task 15: Dashboard summary

**Files:**
- Create: `src/features/dashboard/actions.ts`, `src/features/dashboard/DashboardView.tsx`, `src/app/dashboard/page.tsx`

**Interfaces:**
- Produces: `getDashboardSummary()` — the `/dashboard` landing page.

- [ ] **Step 1: Write `src/features/dashboard/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'

export interface DashboardSummary {
  totalClients: number
  activeClients: number
  unpaidBillsCount: number
  revenueThisMonth: number
  recentUnpaid: { id: string; clientName: string; serviceType: string; amount: number; month: number; year: number }[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [totalClients, activeClients, unpaidBillsCount, paidThisMonth, recentUnpaidBills] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { isActive: true } }),
    prisma.bill.count({ where: { isPaid: false } }),
    prisma.bill.findMany({ where: { isPaid: true, month, year }, select: { amount: true } }),
    prisma.bill.findMany({
      where: { isPaid: false },
      include: { client: { select: { name: true } } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      take: 10,
    }),
  ])

  return {
    totalClients,
    activeClients,
    unpaidBillsCount,
    revenueThisMonth: paidThisMonth.reduce((s, b) => s + Number(b.amount), 0),
    recentUnpaid: recentUnpaidBills.map(b => ({
      id: b.id,
      clientName: b.client.name,
      serviceType: b.serviceType,
      amount: Number(b.amount),
      month: b.month,
      year: b.year,
    })),
  }
}
```

- [ ] **Step 2: Write `src/features/dashboard/DashboardView.tsx`**

```tsx
import { Card, Badge } from '@/lib/ui'
import { fmtXaf, monthName } from '@/lib/utils'
import { getDashboardSummary } from './actions'

export async function DashboardView() {
  const summary = await getDashboardSummary()

  const cards = [
    { label: 'Total Clients', value: summary.totalClients },
    { label: 'Active Clients', value: summary.activeClients },
    { label: 'Unpaid Bills', value: summary.unpaidBillsCount },
    { label: 'Revenue This Month', value: fmtXaf(summary.revenueThisMonth) },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label}>
            <p className="text-xs text-white/50">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card title="Recent Unpaid Bills">
        <table className="w-full text-left text-sm">
          <thead className="text-white/50">
            <tr>
              <th className="pb-2">Client</th>
              <th className="pb-2">Service</th>
              <th className="pb-2">Period</th>
              <th className="pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {summary.recentUnpaid.map(b => (
              <tr key={b.id} className="border-t border-white/10">
                <td className="py-2 text-white">{b.clientName}</td>
                <td className="py-2">
                  <Badge color="blue">{b.serviceType}</Badge>
                </td>
                <td className="py-2 text-white/70">
                  {monthName(b.month)} {b.year}
                </td>
                <td className="py-2 text-white/70">{fmtXaf(b.amount)}</td>
              </tr>
            ))}
            {summary.recentUnpaid.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-white/40">
                  No unpaid bills.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/dashboard/page.tsx`**

```tsx
import { DashboardView } from '@/features/dashboard/DashboardView'

export default function DashboardPage() {
  return <DashboardView />
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard src/app/dashboard/page.tsx
git commit -m "feat: add dashboard summary cards and recent unpaid bills"
```

---

### Task 16: Reports module (Admin only)

**Files:**
- Create: `src/features/reports/actions.ts`, `src/features/reports/ReportsView.tsx`, `src/app/dashboard/reports/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 5).
- Produces: `getReport(month, year)`, `saveProviderCost(input)`.

- [ ] **Step 1: Write `src/features/reports/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export interface ReportData {
  month: number
  year: number
  internetCollected: number
  internetProviderCost: number
  internetProfit: number
  waterCollected: number
  waterProviderCost: number
  waterProfit: number
  rentCollected: number
  netProfit: number
}

export async function getReport(month: number, year: number): Promise<ReportData | { error: string }> {
  const session = await auth()
  if (!requireAdmin(session)) return { error: 'Forbidden' }

  const [internetBills, waterBills, rentBills, internetCost, waterCost] = await Promise.all([
    prisma.bill.findMany({ where: { serviceType: 'INTERNET', isPaid: true, month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'WATER', isPaid: true, month, year } }),
    prisma.bill.findMany({ where: { serviceType: 'RENT', isPaid: true, month, year } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'INTERNET', month, year } } }),
    prisma.providerCost.findUnique({ where: { serviceType_month_year: { serviceType: 'WATER', month, year } } }),
  ])

  const internetCollected = internetBills.reduce((s, b) => s + Number(b.amount), 0)
  const waterCollected = waterBills.reduce((s, b) => s + Number(b.amount), 0)
  const rentCollected = rentBills.reduce((s, b) => s + Number(b.amount), 0)
  const internetProviderCost = internetCost ? Number(internetCost.amount) : 0
  const waterProviderCost = waterCost ? Number(waterCost.amount) : 0
  const internetProfit = internetCollected - internetProviderCost
  const waterProfit = waterCollected - waterProviderCost

  return {
    month,
    year,
    internetCollected,
    internetProviderCost,
    internetProfit,
    waterCollected,
    waterProviderCost,
    waterProfit,
    rentCollected,
    netProfit: internetProfit + waterProfit + rentCollected,
  }
}

interface ProviderCostInput {
  serviceType: 'INTERNET' | 'WATER'
  month: number
  year: number
  amount: number
  notes?: string
}

export async function saveProviderCost(input: ProviderCostInput): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }

  await prisma.providerCost.upsert({
    where: { serviceType_month_year: { serviceType: input.serviceType, month: input.month, year: input.year } },
    update: { amount: input.amount, notes: input.notes },
    create: { ...input },
  })

  revalidatePath('/dashboard/reports')
  return { success: true, data: undefined }
}
```

Note: this requires a compound unique constraint named `serviceType_month_year` on `ProviderCost` — Prisma generates this name automatically from `@@unique([serviceType, month, year])` already declared in Task 2's schema, so no schema change is needed here.

- [ ] **Step 2: Write `src/features/reports/ReportsView.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card, Input, Button } from '@/lib/ui'
import { fmtXaf } from '@/lib/utils'
import { getReport, saveProviderCost, type ReportData } from './actions'

export function ReportsView() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [report, setReport] = useState<ReportData | null>(null)
  const [internetCost, setInternetCost] = useState(0)
  const [waterCost, setWaterCost] = useState(0)

  async function refresh() {
    const result = await getReport(month, year)
    if ('error' in result) return
    setReport(result)
    setInternetCost(result.internetProviderCost)
    setWaterCost(result.waterProviderCost)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  async function handleSaveCosts() {
    await saveProviderCost({ serviceType: 'INTERNET', month, year, amount: internetCost })
    await saveProviderCost({ serviceType: 'WATER', month, year, amount: waterCost })
    refresh()
  }

  return (
    <div className="space-y-6">
      <Card title="Monthly P&L">
        <div className="mb-4 flex gap-3">
          <Input label="Month" type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))} />
          <Input label="Year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
        </div>

        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-white/50">Internet Collected</p>
                <p className="text-white">{fmtXaf(report.internetCollected)}</p>
              </div>
              <div>
                <p className="text-white/50">Water Collected</p>
                <p className="text-white">{fmtXaf(report.waterCollected)}</p>
              </div>
              <div>
                <p className="text-white/50">Rent Collected</p>
                <p className="text-white">{fmtXaf(report.rentCollected)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Input
                label="Internet provider cost"
                type="number"
                value={internetCost}
                onChange={e => setInternetCost(Number(e.target.value))}
              />
              <Input
                label="Water provider cost"
                type="number"
                value={waterCost}
                onChange={e => setWaterCost(Number(e.target.value))}
              />
              <div className="self-end">
                <Button onClick={handleSaveCosts}>Save Costs</Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-4 text-sm">
              <div>
                <p className="text-white/50">Internet Profit</p>
                <p className="text-white">{fmtXaf(report.internetProfit)}</p>
              </div>
              <div>
                <p className="text-white/50">Water Profit</p>
                <p className="text-white">{fmtXaf(report.waterProfit)}</p>
              </div>
              <div>
                <p className="font-semibold text-teal">Net Profit</p>
                <p className="text-lg font-bold text-white">{fmtXaf(report.netProfit)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/dashboard/reports/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { ReportsView } from '@/features/reports/ReportsView'

export default async function ReportsPage() {
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard')
  return <ReportsView />
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/reports src/app/dashboard/reports
git commit -m "feat: add Reports module (Admin only) with P&L and provider costs"
```

---

### Task 17: Terms module (Admin only)

**Files:**
- Create: `src/features/terms/actions.ts`, `src/features/terms/TermsEditor.tsx`, `src/app/dashboard/terms/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (Task 5).
- Produces: `getTerms()`, `saveTerms(text)`.

- [ ] **Step 1: Write `src/features/terms/actions.ts`**

```typescript
'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function getTerms(): Promise<string> {
  const settings = await prisma.billingSettings.findUnique({ where: { id: 1 } })
  return settings?.termsText ?? ''
}

export async function saveTerms(text: string): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }

  await prisma.billingSettings.upsert({
    where: { id: 1 },
    update: { termsText: text },
    create: { id: 1, termsText: text },
  })

  revalidatePath('/dashboard/terms')
  return { success: true, data: undefined }
}
```

- [ ] **Step 2: Write `src/features/terms/TermsEditor.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Card, Textarea, Button } from '@/lib/ui'
import { saveTerms } from './actions'

export function TermsEditor({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await saveTerms(text)
    setSaving(false)
    setMessage(result.success ? 'Saved.' : result.error)
  }

  return (
    <Card title="Terms & Conditions">
      <Textarea value={text} onChange={e => setText(e.target.value)} rows={8} />
      {message && <p className="mt-2 text-sm text-teal">{message}</p>}
      <div className="mt-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Write `src/app/dashboard/terms/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { getTerms } from '@/features/terms/actions'
import { TermsEditor } from '@/features/terms/TermsEditor'

export default async function TermsPage() {
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard')
  const terms = await getTerms()
  return <TermsEditor initialText={terms} />
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/terms src/app/dashboard/terms
git commit -m "feat: add Terms module (Admin only)"
```

---

### Task 18: Data migration script

**Files:**
- Create: `prisma/seed-migrate.ts`

**Interfaces:**
- Consumes: `PrismaClient` (Task 2), reads `C:\JENEUS FILES\BILL PAYMENT\data\billing-data.json`.
- Produces: populated `Client`, `ClientService`, `Bill`, `WaterReading`, `Payment`, `ProviderCost`, `BillingSettings` rows.

- [ ] **Step 1: Write `prisma/seed-migrate.ts`**

```typescript
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
    bp_clients?: LegacyClient[]
    bp_bills?: LegacyBill[]
    bp_waterReadings?: LegacyWaterReading[]
    bp_payments?: LegacyPayment[]
    bp_providerCosts?: LegacyProviderCost[]
    bp_terms?: string
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

  for (const c of legacy.bp_clients ?? []) {
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
  for (const b of legacy.bp_bills ?? []) {
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
  for (const r of legacy.bp_waterReadings ?? []) {
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
  for (const p of legacy.bp_payments ?? []) {
    const billId = billIdMap.get(p.billId)
    if (!billId) continue
    await prisma.payment.create({
      data: { billId, amountPaid: p.amountPaid, paymentDate: new Date(p.paymentDate), notes: p.notes },
    })
    paymentCount++
  }
  console.log(`Migrated ${paymentCount} payments.`)

  let costCount = 0
  for (const pc of legacy.bp_providerCosts ?? []) {
    await prisma.providerCost.create({
      data: { serviceType: SERVICE_MAP[pc.serviceType], month: pc.month, year: pc.year, amount: pc.amount, notes: pc.notes },
    })
    costCount++
  }
  console.log(`Migrated ${costCount} provider costs.`)

  if (legacy.bp_terms) {
    await prisma.billingSettings.upsert({
      where: { id: 1 },
      update: { termsText: legacy.bp_terms },
      create: { id: 1, termsText: legacy.bp_terms },
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
```

- [ ] **Step 2: Run the migration against the local dev database and verify**

Run: `npx tsx prisma/seed-migrate.ts`
Expected: prints migrated counts for clients/bills/readings/payments/provider costs/terms, exits 0.

Run: `npx prisma studio`, open the `Client` table, confirm the count matches `bp_clients` in `BILL PAYMENT/data/billing-data.json`. Close it.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed-migrate.ts
git commit -m "feat: add one-time migration script for legacy billing-data.json"
```

---

### Task 19: Manual smoke test

**Files:** none created — this task drives the app end-to-end to catch integration issues the per-task `tsc --noEmit` checks can't.

- [ ] **Step 1: Reset the local database to a clean state and re-seed**

Run: `npx prisma db push --force-reset` (local dev only — this drops and recreates all tables)
Expected: `Your database is now in sync with your Prisma schema.`

Run: `npx prisma db seed`
Expected: prints seeded ADMIN/CARETAKER credentials.

Run: `npx tsx prisma/seed-migrate.ts`
Expected: prints migrated counts.

- [ ] **Step 2: Start the dev server and log in**

Run: `npm run dev &` then poll `curl -sf http://localhost:3000/login` until it succeeds (use the `run` skill's server pattern: background launch + poll, not a raw sleep).

Use the `run` skill (chromium-cli or equivalent) to:
1. Navigate to `http://localhost:3000/login`
2. Fill email `admin@jeneustech.com`, password `admin123`, submit
3. `wait-for` the Dashboard heading, screenshot
4. Confirm the 4 summary cards show non-zero client counts (proves the migration data loaded)

- [ ] **Step 3: Drive one bill end-to-end**

1. Navigate to Clients, confirm the migrated client list renders with correct service badges
2. Navigate to Water Bills, select a client with a WATER service, enter a current reading above their last recorded reading, confirm the live breakdown box shows `consumption × 700 + 1000 + 2000`
3. Generate the bill, confirm it appears in the Water Bills table as Unpaid
4. Navigate to Payments, find that bill, click "Mark Paid + Receipt", confirm a PDF downloads and the bill disappears from the unpaid list
5. Open the downloaded receipt PDF (via the Read tool) and visually confirm there are no lines crossing any text — this is the exact defect class fixed in support-platform's invoice PDF, so it's worth checking explicitly here too

- [ ] **Step 4: Confirm RBAC**

1. Sign out, sign in as `caretaker@jeneustech.com` / `caretaker123`
2. Confirm the sidebar does NOT show "Reports" or "Terms"
3. Navigate directly to `http://localhost:3000/dashboard/reports` — confirm it redirects to `/dashboard` instead of showing the page

- [ ] **Step 5: Check for console errors**

Run `console --errors` (or equivalent) after each navigation in the steps above.
Expected: no errors — a page rendering its shell while a data fetch 500s would otherwise go unnoticed.

- [ ] **Step 6: Stop the dev server**

Run: `kill %1` (or `pkill -f "next dev"`)

No commit for this task — it's verification only. If any step fails, fix the underlying code in the relevant task's files and re-run this task's steps before proceeding.

---

### Task 20: Deployment

**Files:** none created — infrastructure/CLI steps only.

- [ ] **Step 1: Create the GitHub repo and push**

Run:
```bash
gh repo create Foryoung-Billing --private --source=. --remote=origin
git push -u origin main
```
Expected: repo created, push succeeds.

- [ ] **Step 2: Create the Vercel project and provision Postgres**

Run: `npx vercel link` (creates/links the Vercel project, follow prompts to name it `foryoungs-billing`)
Expected: `.vercel/project.json` created.

In the Vercel dashboard for this project: Storage → Create Database → Postgres. This injects `DATABASE_URL`, `POSTGRES_URL`, `PRISMA_DATABASE_URL` into the project's environment variables automatically (same mechanism support-platform uses).

- [ ] **Step 3: Set remaining production environment variables**

In the Vercel dashboard, Settings → Environment Variables, add for Production:
- `AUTH_SECRET` — generate fresh with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (do not reuse support-platform's)
- `NEXT_PUBLIC_COMPANY_DOMAIN` = `platform.jeneustech.com`

- [ ] **Step 4: Add the custom domain**

In the Vercel dashboard, Settings → Domains, add `platform.jeneustech.com`. Vercel will show the required DNS record (typically a CNAME to `cname.vercel-dns.com`). Add that CNAME at the DNS registrar for `jeneustech.com` (same registrar/pattern already used for `support.jeneustech.com`).

- [ ] **Step 5: Deploy to production**

Run: `npx vercel --prod`
Expected: build succeeds, ends with `Production` URL and, once DNS propagates, aliased to `https://platform.jeneustech.com`.

- [ ] **Step 6: Push the schema and seed the production database**

Run: `npx vercel env pull .env.production.local` to get the production `DATABASE_URL` locally.

Run: `DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-) npx prisma db push`
Expected: schema applied to the production database.

Run: `DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-) npx tsx prisma/seed.ts`
Expected: prints seeded ADMIN/CARETAKER credentials for production.

Run: `DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-) npx tsx prisma/seed-migrate.ts`
Expected: prints migrated counts for the legacy billing data.

Delete `.env.production.local` afterward (it contains production secrets and must not be committed):
Run: `rm .env.production.local`

- [ ] **Step 7: Verify production**

Navigate to `https://platform.jeneustech.com/login` in a browser, sign in as the seeded admin, change the default password is on the list for a follow-up (not built in v1 — note this as a manual step: update the admin's `passwordHash` directly via `prisma studio` pointed at the production `DATABASE_URL`, or plan a "change password" feature in a later iteration).

No commit for this task — it's infrastructure setup, nothing in the repo changes beyond what Task 1–19 already committed.

---

## Self-Review

**Spec coverage:**
- Architecture & stack → Task 1
- Data model → Task 2
- Auth & RBAC → Tasks 5, 8, 16, 17 (login, sidebar gating, Reports/Terms admin-only enforcement)
- Billing calculations (water/internet/rent/arrears) → Task 4, consumed by Tasks 10–12
- Clients module → Task 9
- Internet/Water/Rent Bills modules → Tasks 10, 11, 12
- Payments module → Task 14
- Reports module (Admin only) → Task 16
- Terms module (Admin only) → Task 17
- Dashboard → Task 15
- Receipts (jsPDF direct-draw) → Task 13
- Data migration → Task 18
- Testing (Vitest for calculators + manual smoke test) → Tasks 4, 19
- Deployment (Vercel, Postgres, domain) → Task 20

**Placeholder scan:** No TBD/TODO markers. Every step has complete, runnable code or an exact command with expected output. The one deliberately-deferred item (admin password change UI) is explicitly named as out-of-scope-for-v1 with a manual workaround, not left as a silent gap.

**Type consistency:** `ActionResult<T>` (Task 3) is used with the same shape across every action file (Tasks 9–18). `ClientWithServices`/`ClientFormInput` (Task 9) are the only client shapes referenced elsewhere. `WaterBillBreakdown`, `ArrearsSummary`, `ArrearsBill` (Task 4) are imported by name, not redefined, in Tasks 10–11. `ReceiptData` (Task 13) matches the object literal built in Task 14's `PaymentList.tsx`. `getClientsForDropdown(serviceType?)` (Task 9) signature matches every call site in Tasks 10–12.
