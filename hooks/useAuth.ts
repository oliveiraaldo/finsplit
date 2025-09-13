'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(requireAuth = true) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') {
      // Redirecionar para login se não autenticado
      router.push('/auth/signin')
    }
  }, [status, requireAuth, router])

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/auth/signin',
        redirect: true 
      })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Forçar redirecionamento em caso de erro
      router.push('/auth/signin')
    }
  }

  const isAuthenticated = status === 'authenticated' && !!session
  const isLoading = status === 'loading'

  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    handleSignOut,
    user: session?.user
  }
}
