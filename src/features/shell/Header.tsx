'use client'

import { signOut } from 'next-auth/react'

export function Header({ userName }: { userName: string }) {
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-dark-card px-4 py-3">
      <span className="font-semibold text-white">Foryoung&apos;s Billing</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-white/70">{userName}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-white/50 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  )
}
