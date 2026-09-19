'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  isAdmin: boolean
  platformSlug: string
}

export function MobileNav({ isAdmin, platformSlug }: MobileNavProps) {
  const base = '/dashboard/' + platformSlug
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const ITEMS = [
    { path: '', label: 'Home', icon: '📊' },
    { path: '/clients', label: 'Clients', icon: '👥' },
    { path: '/payments', label: 'Payments', icon: '💰' },
  ]

  const MORE_ITEMS = [
    { path: '/internet-bills', label: 'Internet Bills', icon: '🌐', adminOnly: false },
    { path: '/water-bills', label: 'Water Bills', icon: '💧', adminOnly: false },
    { path: '/rent-bills', label: 'Rent Bills', icon: '🏠', adminOnly: false },
    { path: '/reports', label: 'Reports', icon: '📈', adminOnly: true },
    { path: '/terms', label: 'Terms', icon: '📜', adminOnly: true },
    { path: '/settings/platforms', label: 'Platforms', icon: '⚙️', adminOnly: true },
  ]

  const moreItems = MORE_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-white/10 bg-dark-card py-2 md:hidden">
        {ITEMS.map(item => {
          const href = base + item.path
          const isActive = item.path === '' ? pathname === base : pathname.startsWith(href)
          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 text-xs text-white/60 transition-colors hover:text-white',
                isActive && 'font-semibold text-white',
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center gap-0.5 text-xs text-white/60 transition-colors hover:text-white',
            moreOpen && 'font-semibold text-white',
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
                className="text-sm text-white/50 transition-colors hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {moreItems.map(item => {
                const href = base + item.path
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={item.path}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded px-3 py-2 text-sm text-white/70 transition-colors',
                      isActive
                        ? 'bg-[#2d4a7a] font-semibold text-white'
                        : 'hover:bg-[#253e66] hover:text-white',
                    )}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
