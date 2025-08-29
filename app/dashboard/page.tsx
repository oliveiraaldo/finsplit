'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { DashboardStats } from '@/components/dashboard/stats'
import { RecentExpenses } from '@/components/dashboard/recent-expenses'
import { GroupList } from '@/components/dashboard/group-list'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    setIsLoading(false)
  }, [status, router])

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {session.user.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Bem-vindo ao seu painel de controle de despesas
          </p>
        </div>

        <DashboardStats />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentExpenses />
          <GroupList />
        </div>
      </div>
    </DashboardLayout>
  )
} 