'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '📊' },
  { href: '/dashboard/clients', label: 'Clients', icon: '👥' },
  { href: '/dashboard/payments', label: 'Payments', icon: '💰' },
]

const MORE_ITEMS = [
  { href: '/dashboard/internet-bills', label: 'Internet Bills', icon: '🌐', adminOnly: false },
  { href: '/dashboard/water-bills', label: 'Water Bills', icon: '💧', adminOnly: false },
  { href: '/dashboard/rent-bills', label: 'Rent Bills', icon: '🏠', adminOnly: false },
  { href: '/dashboard/reports', label: 'Reports', icon: '📈', adminOnly: true },
  { href: '/dashboard/terms', label: 'Terms', icon: '📜', adminOnly: true },
]

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreItems = MORE_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/10 bg-dark-card py-2 md:hidden">
        {ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 text-xs text-white/60 transition-colors hover:text-teal',
              pathname === item.href && 'font-semibold text-teal',
            )}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center gap-0.5 text-xs text-white/60 transition-colors hover:text-teal',
            moreOpen && 'font-semibold text-teal',
          )}
        >
          <span aria-hidden="true">☰</span>
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-white/10 bg-dark-card p-4 pb-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-sm text-white/50 transition-colors hover:text-teal"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {moreItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded px-3 py-2 text-sm text-white/70 transition-colors',
                    pathname === item.href
                      ? 'bg-navy font-semibold text-white'
                      : 'hover:bg-navy hover:text-teal',
                  )}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
