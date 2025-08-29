'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Receipt, TrendingUp, CreditCard } from 'lucide-react'

interface DashboardStats {
  totalGroups: number
  totalExpenses: number
  totalMembers: number
  monthlySpending: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalGroups: 0,
    totalExpenses: 0,
    totalMembers: 0,
    monthlySpending: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Dados recebidos da API:', data)
          console.log('📊 Tipo de monthlySpending:', typeof data.monthlySpending)
          console.log('📊 Valor de monthlySpending:', data.monthlySpending)
          setStats(data)
        } else {
          console.error('Erro ao buscar estatísticas:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Grupos',
      value: Number(stats.totalGroups || 0),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total de Despesas',
      value: Number(stats.totalExpenses || 0),
      icon: Receipt,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total de Membros',
      value: Number(stats.totalMembers || 0),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Gastos do Mês',
      value: `R$ ${Number(stats.monthlySpending || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
} 