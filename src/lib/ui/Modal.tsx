'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  size?: Size
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, size = 'md', title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={cn('w-full rounded-lg border border-white/10 bg-dark-card p-6', sizeClasses[size])}
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
