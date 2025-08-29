'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Receipt, 
  Plus, 
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { ExpenseModal } from '@/components/dashboard/expense-modal'

interface Expense {
  id: string
  description: string
  amount: number
  date: string
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED'
  paidBy: string
  groupName: string
  category?: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [selectedExpense, setSelectedExpense] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch('/api/dashboard/expenses')
        if (response.ok) {
          const data = await response.json()
          setExpenses(data)
          setFilteredExpenses(data)
        } else {
          console.error('Erro ao buscar despesas:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar despesas:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExpenses()
  }, [])

  // Filtrar despesas baseado no termo de busca e status
  useEffect(() => {
    let filtered = expenses

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter)
    }

    // Filtro por busca
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.paidBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.groupName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredExpenses(filtered)
  }, [searchTerm, statusFilter, expenses])

  const handleViewExpense = async (expenseId: string) => {
    console.log('🔍 Visualizando despesa:', expenseId)
    try {
      const response = await fetch(`/api/expenses/${expenseId}`)
      if (response.ok) {
        const expenseData = await response.json()
        setSelectedExpense({ ...expenseData, editMode: false })
        setIsModalOpen(true)
      } else {
        toast.error('Erro ao carregar dados da despesa')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar dados da despesa')
    }
  }

  const handleEditExpense = async (expenseId: string) => {
    console.log('✏️ Editando despesa:', expenseId)
    try {
      const response = await fetch(`/api/expenses/${expenseId}`)
      if (response.ok) {
        const expenseData = await response.json()
        setSelectedExpense({ ...expenseData, editMode: true })
        setIsModalOpen(true)
      } else {
        toast.error('Erro ao carregar dados da despesa')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao carregar dados da despesa')
    }
  }

  const handleUpdateExpense = (updatedExpense: any) => {
    console.log('🔄 Atualizando despesa na lista:', updatedExpense)
    try {
      setExpenses(expenses.map(e => 
        e.id === updatedExpense.id ? {
          ...e,
          description: updatedExpense.description,
          amount: updatedExpense.amount,
          date: updatedExpense.date,
          status: updatedExpense.status,
          category: updatedExpense.category,
          categoryId: updatedExpense.categoryId
        } : e
      ))
      console.log('✅ Lista de despesas atualizada')
    } catch (error) {
      console.error('❌ Erro ao atualizar lista de despesas:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setExpenses(expenses.filter(e => e.id !== expenseId))
        toast.success('Despesa excluída com sucesso')
      } else {
        toast.error('Erro ao excluir despesa')
      }
    } catch (error) {
      toast.error('Erro ao excluir despesa')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const exportToCSV = () => {
    const headers = ['Descrição', 'Valor', 'Data', 'Status', 'Pago por', 'Grupo', 'Categoria']
    const csvData = filteredExpenses.map(expense => [
      expense.description,
      expense.amount.toFixed(2),
      new Date(expense.date).toLocaleDateString('pt-BR'),
      expense.status,
      expense.paidBy,
      expense.groupName,
      expense.category || '-'
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `despesas_${new Date().toISOString().split('T')[0]}.csv`)
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
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Minhas Despesas</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as suas despesas e pagamentos</p>
          </div>
          
          <Link href="/dashboard/expenses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </Link>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="REJECTED">Rejeitadas</option>
          </select>
          
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Confirmadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {expenses.filter(e => e.status === 'CONFIRMED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {expenses.filter(e => e.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Despesas */}
        {filteredExpenses.length > 0 ? (
          <div className="space-y-4">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                        {getStatusBadge(expense.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>{expense.category || 'Sem categoria'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{expense.paidBy}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span>{expense.groupName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          R$ {expense.amount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewExpense(expense.id)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditExpense(expense.id)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteExpense(expense.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm || statusFilter !== 'all' ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa encontrada</h3>
            <p className="text-gray-600 mb-4">
              Não encontramos despesas que correspondam aos filtros aplicados
            </p>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all') }}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma despesa registrada</h3>
            <p className="text-gray-600 mb-6">
              Comece registrando suas primeiras despesas
            </p>
            <Link href="/dashboard/expenses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primeira Despesa
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Modal de Despesa */}
      <ExpenseModal
        expense={selectedExpense}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedExpense(null)
        }}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />
    </DashboardLayout>
  )
} 