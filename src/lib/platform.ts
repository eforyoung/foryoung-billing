import { cache } from 'react'
import { prisma } from './db/prisma'

export type PlatformInfo = { id: string; name: string; slug: string }

export const getPlatformBySlug = cache(async (slug: string): Promise<PlatformInfo | null> => {
  return prisma.platform.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } })
})

export async function getAllPlatforms(): Promise<PlatformInfo[]> {
  return prisma.platform.findMany({ select: { id: true, name: true, slug: true }, orderBy: { createdAt: 'asc' } })
}
