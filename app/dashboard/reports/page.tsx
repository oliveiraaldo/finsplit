'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  Download,
  Calendar,
  TrendingUp,
  PieChart,
  DollarSign,
  Users,
  Filter,
  Receipt,
  Tag,
  FileText,
  Eye,
  Search,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface ExpenseData {
  id: string
  description: string
  amount: number
  date: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  category?: {
    id: string
    name: string
    icon: string
    color: string
  }
  group: {
    id: string
    name: string
  }
  paidBy: {
    id: string
    name: string
  }
  receiptUrl?: string
  mediaType?: string
  aiExtracted: boolean
  aiConfidence: number
}

interface GroupData {
  id: string
  name: string
  description?: string
  memberCount: number
  totalExpenses: number
  totalAmount: number
  members: Array<{
    id: string
    name: string
    role: string
    permission: string
    paymentPercentage: number
    balance: number
  }>
}

interface CategoryData {
  id: string
  name: string
  icon: string
  color: string
  expenseCount: number
  totalAmount: number
}

interface ReportFilters {
  dateRange: string
  startDate: string
  endDate: string
  groupId: string
  categoryId: string
  memberId: string
  status: string
  hasReceipt: string
  aiExtracted: string
}

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: '30',
    startDate: '',
    endDate: '',
    groupId: 'all',
    categoryId: 'all',
    memberId: 'all',
    status: 'all',
    hasReceipt: 'all',
    aiExtracted: 'all'
  })

  const [searchTerm, setSearchTerm] = useState('')

  // Carregar dados iniciais
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      const [expensesRes, groupsRes, categoriesRes] = await Promise.all([
        fetch('/api/dashboard/expenses'),
        fetch('/api/dashboard/groups'),
        fetch('/api/dashboard/categories')
      ])

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(expensesData)
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setGroups(groupsData)
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados dos relatórios')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await fetchAllData()
    setIsRefreshing(false)
    toast.success('Dados atualizados com sucesso!')
  }

  // Filtrar despesas
  const getFilteredExpenses = () => {
    let filtered = expenses

    // Filtro por período
    if (filters.dateRange !== 'all') {
      if (filters.dateRange === 'custom') {
        if (filters.startDate && filters.endDate) {
          const start = new Date(filters.startDate)
          const end = new Date(filters.endDate)
          end.setHours(23, 59, 59, 999) // Incluir o dia inteiro
          filtered = filtered.filter(expense => {
            const expenseDate = new Date(expense.date)
            return expenseDate >= start && expenseDate <= end
          })
        }
      } else {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(filters.dateRange))
        filtered = filtered.filter(expense => new Date(expense.date) >= daysAgo)
      }
    }

    // Filtro por grupo
    if (filters.groupId !== 'all') {
      filtered = filtered.filter(expense => expense.group.id === filters.groupId)
    }

    // Filtro por categoria
    if (filters.categoryId !== 'all') {
      filtered = filtered.filter(expense => expense.category?.id === filters.categoryId)
    }

    // Filtro por status
    if (filters.status !== 'all') {
      filtered = filtered.filter(expense => expense.status === filters.status)
    }

    // Filtro por recibo
    if (filters.hasReceipt !== 'all') {
      if (filters.hasReceipt === 'yes') {
        filtered = filtered.filter(expense => expense.receiptUrl)
      } else {
        filtered = filtered.filter(expense => !expense.receiptUrl)
      }
    }

    // Filtro por AI
    if (filters.aiExtracted !== 'all') {
      if (filters.aiExtracted === 'yes') {
        filtered = filtered.filter(expense => expense.aiExtracted)
      } else {
        filtered = filtered.filter(expense => !expense.aiExtracted)
      }
    }

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(expense => 
        expense.description.toLowerCase().includes(term) ||
        expense.paidBy.name.toLowerCase().includes(term) ||
        expense.group.name.toLowerCase().includes(term) ||
        expense.category?.name.toLowerCase().includes(term)
      )
    }

    return filtered
  }

  const filteredExpenses = getFilteredExpenses()

  // Estatísticas calculadas
  const stats = {
    totalExpenses: filteredExpenses.length,
    totalAmount: filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    averageAmount: filteredExpenses.length > 0 ? filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0) / filteredExpenses.length : 0,
    confirmedExpenses: filteredExpenses.filter(e => e.status === 'CONFIRMED').length,
    pendingExpenses: filteredExpenses.filter(e => e.status === 'PENDING').length,
    withReceipts: filteredExpenses.filter(e => e.receiptUrl).length,
    aiExtracted: filteredExpenses.filter(e => e.aiExtracted).length,
    uniqueCategories: new Set(filteredExpenses.map(e => e.category?.id).filter(Boolean)).size,
    uniqueGroups: new Set(filteredExpenses.map(e => e.group.id)).size,
    uniqueMembers: new Set(filteredExpenses.map(e => e.paidBy.id)).size
  }

  // Dados para gráficos
  const chartData = {
    byCategory: filteredExpenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Sem categoria'
      const categoryIcon = expense.category?.icon || '📋'
      const categoryColor = expense.category?.color || '#6b7280'
      
      if (!acc[categoryName]) {
        acc[categoryName] = { amount: 0, count: 0, icon: categoryIcon, color: categoryColor }
      }
      acc[categoryName].amount += expense.amount
      acc[categoryName].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number; icon: string; color: string }>),

    byGroup: filteredExpenses.reduce((acc, expense) => {
      const groupName = expense.group.name
      if (!acc[groupName]) {
        acc[groupName] = { amount: 0, count: 0, id: expense.group.id }
      }
      acc[groupName].amount += expense.amount
      acc[groupName].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number; id: string }>),

    byMember: filteredExpenses.reduce((acc, expense) => {
      const memberName = expense.paidBy.name
      if (!acc[memberName]) {
        acc[memberName] = { amount: 0, count: 0, id: expense.paidBy.id }
      }
      acc[memberName].amount += expense.amount
      acc[memberName].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number; id: string }>),

    byMonth: filteredExpenses.reduce((acc, expense) => {
      const month = new Date(expense.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      if (!acc[month]) {
        acc[month] = { amount: 0, count: 0 }
      }
      acc[month].amount += expense.amount
      acc[month].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number }>),

    byStatus: {
      CONFIRMED: filteredExpenses.filter(e => e.status === 'CONFIRMED').reduce((sum, e) => sum + e.amount, 0),
      PENDING: filteredExpenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0),
      REJECTED: filteredExpenses.filter(e => e.status === 'REJECTED').reduce((sum, e) => sum + e.amount, 0)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Data', 'Descrição', 'Valor', 'Status', 'Categoria', 'Grupo', 
      'Pago por', 'Tem Recibo', 'Extraído por IA', 'Confiança IA'
    ]
    
    const csvData = filteredExpenses.map(expense => [
      new Date(expense.date).toLocaleDateString('pt-BR'),
      expense.description,
      expense.amount.toFixed(2),
      expense.status === 'CONFIRMED' ? 'Confirmada' : expense.status === 'PENDING' ? 'Pendente' : 'Rejeitada',
      expense.category?.name || 'Sem categoria',
      expense.group.name,
      expense.paidBy.name,
      expense.receiptUrl ? 'Sim' : 'Não',
      expense.aiExtracted ? 'Sim' : 'Não',
      expense.aiExtracted ? `${(expense.aiConfidence * 100).toFixed(1)}%` : 'N/A'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_detalhado_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Relatório CSV exportado com sucesso!')
  }

  const exportDetailedReport = () => {
    const reportContent = `
RELATÓRIO FINANCEIRO DETALHADO - FINSPLIT
Gerado em: ${new Date().toLocaleString('pt-BR')}

=== FILTROS APLICADOS ===
Período: ${filters.dateRange === 'all' ? 'Todo período' : filters.dateRange === 'custom' ? `${filters.startDate} até ${filters.endDate}` : `Últimos ${filters.dateRange} dias`}
Grupo: ${filters.groupId === 'all' ? 'Todos os grupos' : groups.find(g => g.id === filters.groupId)?.name || 'N/A'}
Categoria: ${filters.categoryId === 'all' ? 'Todas as categorias' : categories.find(c => c.id === filters.categoryId)?.name || 'N/A'}
Status: ${filters.status === 'all' ? 'Todos os status' : filters.status}
Busca: ${searchTerm || 'Nenhuma'}

=== RESUMO EXECUTIVO ===
Total de Despesas: ${stats.totalExpenses}
Valor Total: R$ ${stats.totalAmount.toFixed(2)}
Valor Médio: R$ ${stats.averageAmount.toFixed(2)}
Despesas Confirmadas: ${stats.confirmedExpenses} (R$ ${chartData.byStatus.CONFIRMED.toFixed(2)})
Despesas Pendentes: ${stats.pendingExpenses} (R$ ${chartData.byStatus.PENDING.toFixed(2)})
Com Recibos: ${stats.withReceipts} (${((stats.withReceipts / stats.totalExpenses) * 100).toFixed(1)}%)
Extraídas por IA: ${stats.aiExtracted} (${((stats.aiExtracted / stats.totalExpenses) * 100).toFixed(1)}%)

=== ANÁLISE POR CATEGORIA ===
${Object.entries(chartData.byCategory)
  .sort(([,a], [,b]) => b.amount - a.amount)
  .map(([category, data]) => 
    `${data.icon} ${category}: R$ ${data.amount.toFixed(2)} (${data.count} despesas - ${((data.amount / stats.totalAmount) * 100).toFixed(1)}%)`
  ).join('\n')}

=== ANÁLISE POR GRUPO ===
${Object.entries(chartData.byGroup)
  .sort(([,a], [,b]) => b.amount - a.amount)
  .map(([group, data]) => 
    `• ${group}: R$ ${data.amount.toFixed(2)} (${data.count} despesas - ${((data.amount / stats.totalAmount) * 100).toFixed(1)}%)`
  ).join('\n')}

=== ANÁLISE POR MEMBRO ===
${Object.entries(chartData.byMember)
  .sort(([,a], [,b]) => b.amount - a.amount)
  .map(([member, data]) => 
    `• ${member}: R$ ${data.amount.toFixed(2)} (${data.count} despesas - ${((data.amount / stats.totalAmount) * 100).toFixed(1)}%)`
  ).join('\n')}

=== EVOLUÇÃO MENSAL ===
${Object.entries(chartData.byMonth)
  .sort(([a], [b]) => new Date(a + ' 01').getTime() - new Date(b + ' 01').getTime())
  .map(([month, data]) => 
    `${month}: R$ ${data.amount.toFixed(2)} (${data.count} despesas)`
  ).join('\n')}

=== DETALHAMENTO DAS DESPESAS ===
${filteredExpenses
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .map(expense => 
    `${new Date(expense.date).toLocaleDateString('pt-BR')} | ${expense.description} | R$ ${expense.amount.toFixed(2)} | ${expense.category?.name || 'Sem categoria'} | ${expense.group.name} | ${expense.paidBy.name} | ${expense.status} | ${expense.receiptUrl ? '📎' : ''}${expense.aiExtracted ? ' 🤖' : ''}`
  ).join('\n')}

---
Relatório gerado automaticamente pelo FinSplit
    `

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_completo_${new Date().toISOString().split('T')[0]}.txt`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Relatório detalhado exportado com sucesso!')
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
            {[...Array(8)].map((_, i) => (
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
            <h1 className="text-3xl font-bold text-gray-900">Relatórios Avançados</h1>
            <p className="text-gray-600 mt-2">
              Análises detalhadas com {stats.totalExpenses} despesas totalizando R$ {stats.totalAmount.toFixed(2)}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={exportDetailedReport}>
              <FileText className="mr-2 h-4 w-4" />
              Relatório Completo
            </Button>
          </div>
        </div>

        {/* Filtros Avançados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Busca */}
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por descrição, pessoa, grupo ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Período */}
              <div>
                <Label>Período</Label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                  <option value="365">Último ano</option>
                  <option value="custom">Período personalizado</option>
                  <option value="all">Todo período</option>
                </select>
              </div>

              {/* Grupo */}
              <div>
                <Label>Grupo</Label>
                <select
                  value={filters.groupId}
                  onChange={(e) => setFilters({ ...filters, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os grupos</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <Label>Categoria</Label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os status</option>
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="REJECTED">Rejeitadas</option>
                </select>
              </div>
            </div>

            {/* Período personalizado */}
            {filters.dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data inicial</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data final</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por recibo */}
              <div>
                <Label>Recibos</Label>
                <select
                  value={filters.hasReceipt}
                  onChange={(e) => setFilters({ ...filters, hasReceipt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="yes">Com recibo</option>
                  <option value="no">Sem recibo</option>
                </select>
              </div>

              {/* Filtro por IA */}
              <div>
                <Label>Extraído por IA</Label>
                <select
                  value={filters.aiExtracted}
                  onChange={(e) => setFilters({ ...filters, aiExtracted: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="yes">Sim</option>
                  <option value="no">Não</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalExpenses}</div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {stats.totalAmount.toFixed(2)} total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Valor Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.averageAmount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Por despesa
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Com Recibos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.withReceipts}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalExpenses > 0 ? ((stats.withReceipts / stats.totalExpenses) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                IA Extraídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.aiExtracted}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalExpenses > 0 ? ((stats.aiExtracted / stats.totalExpenses) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status das Despesas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Confirmadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.confirmedExpenses}</div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {chartData.byStatus.CONFIRMED.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingExpenses}</div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {chartData.byStatus.PENDING.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Rejeitadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredExpenses.filter(e => e.status === 'REJECTED').length}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                R$ {chartData.byStatus.REJECTED.toFixed(2)}
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
                <Tag className="h-5 w-5" />
                Despesas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(chartData.byCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(chartData.byCategory)
                    .sort(([,a], [,b]) => b.amount - a.amount)
                    .slice(0, 10) // Top 10
                    .map(([category, data]) => {
                      const percentage = stats.totalAmount > 0 ? ((data.amount / stats.totalAmount) * 100).toFixed(1) : '0'
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{data.icon}</span>
                            <div>
                              <span className="text-sm font-medium">{category}</span>
                              <div className="text-xs text-gray-500">{data.count} despesas</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R$ {data.amount.toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{percentage}%</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
              {Object.keys(chartData.byGroup).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(chartData.byGroup)
                    .sort(([,a], [,b]) => b.amount - a.amount)
                    .map(([groupName, data]) => {
                      const percentage = stats.totalAmount > 0 ? ((data.amount / stats.totalAmount) * 100).toFixed(1) : '0'
                      return (
                        <div key={groupName} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <span className="text-sm font-medium">{groupName}</span>
                              <div className="text-xs text-gray-500">{data.count} despesas</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">R$ {data.amount.toFixed(2)}</div>
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

        {/* Análise por Membro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Despesas por Membro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(chartData.byMember).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(chartData.byMember)
                  .sort(([,a], [,b]) => b.amount - a.amount)
                  .map(([memberName, data]) => {
                    const percentage = stats.totalAmount > 0 ? ((data.amount / stats.totalAmount) * 100).toFixed(1) : '0'
                    return (
                      <div key={memberName} className="p-4 border rounded-lg">
                        <div className="font-medium">{memberName}</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">
                          R$ {data.amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {data.count} despesas ({percentage}%)
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum membro encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(chartData.byMonth).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(chartData.byMonth)
                  .sort(([a], [b]) => new Date(a + ' 01').getTime() - new Date(b + ' 01').getTime())
                  .map(([month, data]) => {
                    const maxAmount = Math.max(...Object.values(chartData.byMonth).map(d => d.amount))
                    const widthPercentage = maxAmount > 0 ? (data.amount / maxAmount) * 100 : 0
                    return (
                      <div key={month} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-medium">{month}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${widthPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-32 text-right">
                          <div className="font-semibold">R$ {data.amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{data.count} despesas</div>
                        </div>
                      </div>
                    )
                  })}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              
              <Link href="/dashboard/categories">
                <Button variant="outline" className="w-full">
                  <Tag className="mr-2 h-4 w-4" />
                  Categorias
                </Button>
              </Link>
              
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}