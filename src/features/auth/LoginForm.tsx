'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-dark-card p-8">
      <h1 className="text-xl font-bold text-white">Foryoung&apos;s Billing</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div>
        <label className="mb-1 block text-sm text-white/70">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/70">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full rounded border border-white/20 bg-transparent px-3 py-2 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-teal px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
