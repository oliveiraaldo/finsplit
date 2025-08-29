import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Verificar se está tentando acessar dashboard sem autenticação
    if (req.nextUrl.pathname.startsWith('/dashboard') && !req.nextauth.token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/dashboard/:path*',
    '/api/groups/:path*',
    '/api/user/:path*'
  ]
} 