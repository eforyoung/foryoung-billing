import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export default async function DashboardRedirect() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Caretaker: go straight to their assigned platform
  if (session.user.role === 'CARETAKER' && session.user.platformId) {
    const platform = await prisma.platform.findUnique({
      where: { id: session.user.platformId },
      select: { slug: true },
    })
    if (platform) redirect('/dashboard/' + platform.slug)
  }

  // Admin: redirect to first platform
  const first = await prisma.platform.findFirst({ orderBy: { createdAt: 'asc' }, select: { slug: true } })
  if (first) redirect('/dashboard/' + first.slug)

  // No platforms exist yet — admin must create one
  redirect('/login')
}
