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
