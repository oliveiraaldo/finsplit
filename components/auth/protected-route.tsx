'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Verificar se a sessão expirou ou é inválida
    if (status === 'unauthenticated') {
      console.log('🔒 Sessão não autenticada, redirecionando para login...')
      router.push('/auth/signin')
      return
    }

    // Verificar se a sessão existe mas está corrompida
    if (status === 'authenticated' && (!session || !session.user)) {
      console.log('🔒 Sessão corrompida, fazendo logout...')
      router.push('/auth/signin')
      return
    }
  }, [status, session, router])

  // Mostrar loading enquanto verifica a sessão
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não autenticado, mostrar fallback ou nada
  if (status === 'unauthenticated') {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  // Se autenticado mas sessão inválida
  if (status === 'authenticated' && (!session || !session.user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sessão inválida, redirecionando...</p>
        </div>
      </div>
    )
  }

  // Se tudo OK, mostrar o conteúdo
  return <>{children}</>
}
