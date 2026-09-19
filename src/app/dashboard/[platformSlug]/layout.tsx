import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { DashboardShell } from '@/features/shell/DashboardShell'
import { getPlatformBySlug, getAllPlatforms } from '@/lib/platform'

interface Props {
  children: React.ReactNode
  params: Promise<{ platformSlug: string }>
}

export default async function PlatformLayout({ children, params }: Props) {
  const { platformSlug } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()

  // Caretakers can only access their assigned platform
  if (session.user.role === 'CARETAKER' && session.user.platformId !== platform.id) {
    if (session.user.platformId) {
      const { prisma } = await import('@/lib/db/prisma')
      const assigned = await prisma.platform.findUnique({ where: { id: session.user.platformId }, select: { slug: true } })
      if (assigned) redirect('/dashboard/' + assigned.slug)
    }
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'
  const allPlatforms = isAdmin ? await getAllPlatforms() : [platform]
  const userName = session.user.name || session.user.email || 'User'

  return (
    <DashboardShell
      userName={userName}
      isAdmin={isAdmin}
      currentPlatform={platform}
      allPlatforms={allPlatforms}
    >
      {children}
    </DashboardShell>
  )
}
