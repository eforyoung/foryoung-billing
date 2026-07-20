import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Foryoung's Billing",
  description: 'Bill Payment Platform — JENEUS CO LTD',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
