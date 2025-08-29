import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      tenantId: string
      tenant: any
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    tenantId: string
    tenant: any
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    tenantId: string
    tenant: any
  }
} 