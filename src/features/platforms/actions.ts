'use server'

import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface PlatformWithStats {
  id: string
  slug: string
  name: string
  clientCount: number
  userCount: number
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CARETAKER'
  platformId: string | null
  platformName: string | null
}

export async function getPlatformsWithStats(): Promise<PlatformWithStats[]> {
  const session = await auth()
  if (!session?.user) return []

  const platforms = await prisma.platform.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { clients: true, users: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return platforms.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    clientCount: p._count.clients,
    userCount: p._count.users,
  }))
}

export async function getUsers(): Promise<UserRow[]> {
  const session = await auth()
  if (!session?.user) return []

  const users = await prisma.user.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      platformId: true,
      platform: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    platformId: u.platformId,
    platformName: u.platform?.name ?? null,
  }))
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function createPlatform(name: string): Promise<{ success: true; slug: string } | { success: false; error: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Name is required' }

  const baseSlug = slugify(trimmed)
  if (!baseSlug) return { success: false, error: 'Name must contain at least one letter or digit' }

  let slug = baseSlug
  let suffix = 1
  while (await prisma.platform.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const platform = await prisma.platform.create({
    data: { name: trimmed, slug },
  })

  revalidatePath('/dashboard', 'layout')
  return { success: true, slug: platform.slug }
}

export async function renamePlatform(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Name is required' }

  await prisma.platform.update({ where: { id }, data: { name: trimmed } })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function assignUserPlatform(userId: string, platformId: string | null): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user) return { success: false, error: 'Not authenticated' }
  if (session.user.role !== 'ADMIN') return { success: false, error: 'Admin only' }

  await prisma.user.update({ where: { id: userId }, data: { platformId } })
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
