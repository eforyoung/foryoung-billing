'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PlatformInfo } from '@/lib/platform'

const NAV_ITEMS = [
  { path: '', label: 'Dashboard', icon: '📊', adminOnly: false },
  { path: '/clients', label: 'Clients', icon: '👥', adminOnly: false },
  { path: '/internet-bills', label: 'Internet Bills', icon: '🌐', adminOnly: false },
  { path: '/water-bills', label: 'Water Bills', icon: '💧', adminOnly: false },
  { path: '/rent-bills', label: 'Rent Bills', icon: '🏠', adminOnly: false },
  { path: '/payments', label: 'Payments', icon: '💰', adminOnly: false },
  { path: '/reports', label: 'Reports', icon: '📈', adminOnly: true },
  { path: '/terms', label: 'Terms', icon: '📜', adminOnly: true },
  { path: '/settings/platforms', label: 'Platforms', icon: '⚙️', adminOnly: true },
]

interface SidebarProps {
  isAdmin: boolean
  currentPlatform: PlatformInfo
  allPlatforms: PlatformInfo[]
}

export function Sidebar({ isAdmin, currentPlatform, allPlatforms }: SidebarProps) {
  const pathname = usePathname()
  const base = '/dashboard/' + currentPlatform.slug
  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="hidden w-56 flex-col gap-1 border-r border-white/10 bg-dark-card p-4 md:flex">
      <div className="mb-3 border-b border-white/10 px-1 pb-3">
        <h1 className="text-base font-bold tracking-wide text-white">{currentPlatform.name.toUpperCase()}</h1>
        <p className="mt-0.5 text-[11px] text-white/50">Bill Payment Platform</p>
      </div>

      {/* Platform switcher (admin + multiple platforms) */}
      {isAdmin && allPlatforms.length > 1 && (
        <div className="mb-2 border-b border-white/10 pb-2">
          <p className="mb-1 px-1 text-[10px] uppercase tracking-wider text-white/40">Switch Platform</p>
          {allPlatforms.map(p => (
            <Link
              key={p.id}
              href={'/dashboard/' + p.slug}
              className={cn(
                'flex items-center gap-2 rounded px-3 py-1.5 text-xs transition-colors',
                p.slug === currentPlatform.slug
                  ? 'bg-[#2d4a7a] font-semibold text-white'
                  : 'text-white/60 hover:bg-[#253e66] hover:text-white',
              )}
            >
              {p.slug === currentPlatform.slug && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {items.map(item => {
        const href = base + item.path
        const isActive = item.path === '' ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={item.path}
            href={href}
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
    </nav>
  )
}
