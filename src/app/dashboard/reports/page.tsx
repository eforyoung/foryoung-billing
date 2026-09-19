import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export default async function ReportsRedirect() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  if (session.user.role === 'CARETAKER' && session.user.platformId) {
    const platform = await prisma.platform.findUnique({
      where: { id: session.user.platformId },
      select: { slug: true },
    })
    if (platform) redirect('/dashboard/' + platform.slug + '/reports')
  }

  const first = await prisma.platform.findFirst({ orderBy: { createdAt: 'asc' }, select: { slug: true } })
  if (first) redirect('/dashboard/' + first.slug + '/reports')
  redirect('/login')
}
