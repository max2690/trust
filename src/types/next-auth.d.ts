import { UserRole, UserLevel } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      phone: string
      role: UserRole
      level: UserLevel
    }
  }

  interface User {
    id: string
    email?: string | null
    name?: string | null
    phone: string
    role: UserRole
    level: UserLevel
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub: string
    role: UserRole
    level: UserLevel
    phone: string
    email?: string | null
    name?: string | null
  }
}

