import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'

interface DashboardShellProps {
  userName: string
  isAdmin: boolean
  children: ReactNode
}

export function DashboardShell({ userName, isAdmin, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <Header userName={userName} />
        <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
        <MobileNav isAdmin={isAdmin} />
      </div>
    </div>
  )
}
