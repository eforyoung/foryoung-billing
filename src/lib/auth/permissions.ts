import type { Session } from 'next-auth'

export function requireAdmin(session: Session | null): boolean {
  return session?.user?.role === 'ADMIN'
}
