import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: 'ADMIN' | 'CARETAKER'
    platformId: string | null
  }

  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'CARETAKER'
      platformId: string | null
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: 'ADMIN' | 'CARETAKER'
    platformId: string | null
  }
}
