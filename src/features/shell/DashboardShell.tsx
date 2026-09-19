import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import type { PlatformInfo } from '@/lib/platform'

interface DashboardShellProps {
  userName: string
  isAdmin: boolean
  currentPlatform: PlatformInfo
  allPlatforms: PlatformInfo[]
  children: ReactNode
}

export function DashboardShell({ userName, isAdmin, currentPlatform, allPlatforms, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-dark">
      <Sidebar isAdmin={isAdmin} currentPlatform={currentPlatform} allPlatforms={allPlatforms} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={userName} platformName={currentPlatform.name} />
        <main className="min-w-0 flex-1 bg-slate-100 p-4 pb-20 md:p-6">{children}</main>
        <MobileNav isAdmin={isAdmin} platformSlug={currentPlatform.slug} />
      </div>
    </div>
  )
}
