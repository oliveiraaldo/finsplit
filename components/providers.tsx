'use client'

import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Revalidar sessão a cada 5 minutos
      refetchInterval={5 * 60}
      // Revalidar quando a janela ganha foco
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
} 