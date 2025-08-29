'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  BarChart3, 
  Download,
  Calendar,
  TrendingUp,
  PieChart,
  DollarSign,
  Users,
  Filter
} from 'lucide-react'
import Link from 'next/link'

interface ExpenseData {
  id: string
  description: string
  amount: number
  date: string
  category: string
  groupName: string
  paidBy: string
}

interface GroupData {
  id: string
  name: string
  memberCount: number
  totalExpenses: number
}

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30') // dias
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [expensesResponse, groupsResponse] = await Promise.all([
          fetch('/api/dashboard/expenses'),
          fetch('/api/dashboard/groups')
        ])

        if (expensesResponse.ok && groupsResponse.ok) {
          const expensesData = await expensesResponse.json()
          const groupsData = await groupsResponse.json()
          
          setExpenses(expensesData)
          setGroups(groupsData)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtrar despesas por período e grupo
  const getFilteredExpenses = () => {
    let filtered = expenses

    // Filtro por período
    if (dateRange !== 'all') {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange))
      filtered = filtered.filter(expense => new Date(expense.date) >= daysAgo)
    }

    // Filtro por grupo
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(expense => expense.groupName === selectedGroup)
    }

    return filtered
  }

  const filteredExpenses = getFilteredExpenses()

  // Estatísticas calculadas
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0
  const totalGroups = groups.length
  const totalMembers = groups.reduce((sum, group) => sum + group.memberCount, 0)

  // Dados para gráficos
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const category = expense.category || 'Sem categoria'
    acc[category] = (acc[category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const expensesByGroup = filteredExpenses.reduce((acc, expense) => {
    acc[expense.groupName] = (acc[expense.groupName] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const expensesByMonth = filteredExpenses.reduce((acc, expense) => {
    const month = new Date(expense.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Valor', 'Categoria', 'Grupo', 'Pago por']
    const csvData = filteredExpenses.map(expense => [
      new Date(expense.date).toLocaleDateString('pt-BR'),
      expense.description || '',
      expense.amount.toFixed(2),
      expense.category || 'Sem categoria',
      expense.groupName,
      expense.paidBy
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // Implementação básica de PDF (pode ser expandida com bibliotecas como jsPDF)
    const content = `
      Relatório FinSplit - ${new Date().toLocaleDateString('pt-BR')}
      
      Período: ${dateRange === 'all' ? 'Todo período' : `Últimos ${dateRange} dias`}
      Grupo: ${selectedGroup === 'all' ? 'Todos os grupos' : selectedGroup}
      
      Resumo:
      - Total de despesas: ${filteredExpenses.length}
      - Valor total: R$ ${totalExpenses.toFixed(2)}
      - Valor médio: R$ ${averageExpense.toFixed(2)}
      - Total de grupos: ${totalGroups}
      - Total de membros: ${totalMembers}
      
      Despesas por categoria:
      ${Object.entries(expensesByCategory).map(([category, amount]) => 
        `- ${category}: R$ ${amount.toFixed(2)}`
      ).join('\n')}
    `
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_${new Date().toISOString().split('T')[0]}.txt`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-gray-600 mt-2">Análises e estatísticas detalhadas das suas finanças</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Período
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Último ano</option>
                  <option value="all">Todo período</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupo
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">Todos os grupos</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.name}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredExpenses.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {dateRange === 'all' ? 'Todo período' : `Últimos ${dateRange} dias`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Média: R$ {averageExpense.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Grupos Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGroups}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalMembers} membros no total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
              <p className="text-xs text-gray-500 mt-1">
                Diferentes tipos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Despesas por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Despesas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(expensesByCategory)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => {
                      const percentage = ((amount / totalExpenses) * 100).toFixed(1)
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                            <span className="text-sm font-medium">{category}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R$ {amount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhuma despesa encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Despesas por Grupo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Despesas por Grupo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByGroup).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(expensesByGroup)
                    .sort(([,a], [,b]) => b - a)
                    .map(([groupName, amount]) => {
                      const percentage = ((amount / totalExpenses) * 100).toFixed(1)
                      return (
                        <div key={groupName} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium">{groupName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R$ {amount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum grupo encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByMonth).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(expensesByMonth)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([month, amount]) => (
                    <div key={month} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">{month}</div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((amount / Math.max(...Object.values(expensesByMonth))) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-20 text-right font-semibold">
                        R$ {amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhuma despesa encontrada para o período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/expenses/new">
                <Button variant="outline" className="w-full">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Nova Despesa
                </Button>
              </Link>
              
              <Link href="/dashboard/groups/new">
                <Button variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Novo Grupo
                </Button>
              </Link>
              
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Voltar ao Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 