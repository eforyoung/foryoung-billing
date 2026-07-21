'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', adminOnly: false },
  { href: '/dashboard/clients', label: 'Clients', icon: '👥', adminOnly: false },
  { href: '/dashboard/internet-bills', label: 'Internet Bills', icon: '🌐', adminOnly: false },
  { href: '/dashboard/water-bills', label: 'Water Bills', icon: '💧', adminOnly: false },
  { href: '/dashboard/rent-bills', label: 'Rent Bills', icon: '🏠', adminOnly: false },
  { href: '/dashboard/payments', label: 'Payments', icon: '💰', adminOnly: false },
  { href: '/dashboard/reports', label: 'Reports', icon: '📈', adminOnly: true },
  { href: '/dashboard/terms', label: 'Terms', icon: '📜', adminOnly: true },
]

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <nav className="hidden w-56 flex-col gap-1 border-r border-white/10 bg-dark-card p-4 md:flex">
      <div className="mb-4 flex justify-center">
        <Image src="/logo.png" alt="4Young Inc." width={176} height={141} priority />
      </div>
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-2 rounded px-3 py-2 text-sm text-white/70 transition-colors',
            pathname === item.href
              ? 'bg-navy font-semibold text-white hover:bg-navy hover:text-white'
              : 'hover:bg-navy hover:text-teal',
          )}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
