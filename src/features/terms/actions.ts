'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function getTerms(platformId: string): Promise<string> {
  const session = await auth()
  if (!session?.user) return ''

  const settings = await prisma.billingSettings.findUnique({ where: { platformId } })
  return settings?.termsText ?? ''
}

export async function saveTerms(platformId: string, text: string): Promise<ActionResult> {
  const session = await auth()
  if (!requireAdmin(session)) return { success: false, error: 'Forbidden' }

  await prisma.billingSettings.upsert({
    where: { platformId },
    update: { termsText: text },
    create: { platformId, termsText: text },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true, data: undefined }
}
