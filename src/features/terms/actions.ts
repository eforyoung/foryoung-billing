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
