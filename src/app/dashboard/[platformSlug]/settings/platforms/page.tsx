import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'
import { getPlatformBySlug } from '@/lib/platform'
import { PlatformManager } from '@/features/platforms/PlatformManager'
import { getPlatformsWithStats, getUsers } from '@/features/platforms/actions'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function PlatformsSettingsPage({ params }: Props) {
  const { platformSlug } = await params
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard/' + platformSlug)

  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()

  const [platforms, users] = await Promise.all([getPlatformsWithStats(), getUsers()])
  return <PlatformManager platforms={platforms} users={users} currentPlatformSlug={platformSlug} />
}
