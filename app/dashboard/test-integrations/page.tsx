'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { Shield, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TestIntegrationsPage() {
  const { session, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && session?.user?.role === 'ADMIN') {
      router.push('/admin/test-integrations')
    }
  }, [isAuthenticated, session, router])

  if (session?.user?.role === 'ADMIN') {
    return null // Redirecionando...
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 max-w-md text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-gray-600 mb-6">
            Esta funcionalidade está disponível apenas para administradores do sistema.
          </p>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Se você é um administrador, acesse o painel admin:
            </p>
            <Button 
              onClick={() => router.push('/admin/test-integrations')}
              className="w-full"
              variant="outline"
            >
              Ir para Painel Admin
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}