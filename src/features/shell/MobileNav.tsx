'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/clients', label: 'Clients' },
  { href: '/dashboard/payments', label: 'Payments' },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-white/10 bg-dark-card py-2 md:hidden">
      {ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-xs text-white/60 transition-colors hover:text-teal',
            pathname === item.href && 'font-semibold text-teal',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
