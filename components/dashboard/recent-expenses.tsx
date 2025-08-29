'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  paidBy: {
    name: string
  }
}

export function RecentExpenses() {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecentExpenses = async () => {
      try {
        const response = await fetch('/api/dashboard/recent-expenses')
        if (response.ok) {
          const data = await response.json()
          setRecentExpenses(data)
        } else {
          console.error('Erro ao buscar despesas recentes:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar despesas recentes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentExpenses()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-green-600'
      case 'PENDING':
        return 'text-yellow-600'
      case 'REJECTED':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Despesas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentExpenses.length > 0 ? (
          <div className="space-y-4">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(expense.status)}
                    <span className="font-medium">{expense.description}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Pago por {expense.paidBy.name} • {new Date(expense.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">R$ {expense.amount.toFixed(2)}</div>
                  <div className={`text-xs ${getStatusColor(expense.status)}`}>
                    {expense.status === 'CONFIRMED' ? 'Confirmada' : 
                     expense.status === 'PENDING' ? 'Pendente' : 'Rejeitada'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma despesa encontrada</p>
            <p className="text-sm">As despesas aparecerão aqui quando forem criadas</p>
          </div>
        )}
        
        <div className="mt-4 text-center">
          <Link href="/dashboard/expenses" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Ver todas as despesas →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
} 