import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: 'ADMIN' | 'CARETAKER'
  }

  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'CARETAKER'
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: 'ADMIN' | 'CARETAKER'
  }
}
