import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref,
) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm text-slate-600">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <div>
      {label && <label className="mb-1 block text-sm text-slate-600">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})
