import { getPlatformBySlug } from '@/lib/platform'
import { notFound, redirect } from 'next/navigation'
import { TermsEditor } from '@/features/terms/TermsEditor'
import { getTerms } from '@/features/terms/actions'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth/permissions'

interface Props { params: Promise<{ platformSlug: string }> }

export default async function TermsPage({ params }: Props) {
  const { platformSlug } = await params
  const session = await auth()
  if (!requireAdmin(session)) redirect('/dashboard/' + platformSlug)

  const platform = await getPlatformBySlug(platformSlug)
  if (!platform) notFound()
  const termsText = await getTerms(platform.id)
  return <TermsEditor initialText={termsText} platformId={platform.id} />
}
