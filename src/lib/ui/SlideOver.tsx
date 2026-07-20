'use client'

import type { ReactNode } from 'react'

interface SlideOverProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function SlideOver({ open, onClose, title, children }: SlideOverProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-dark-card p-6"
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
