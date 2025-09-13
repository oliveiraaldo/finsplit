'use client'
import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Zap, 
  Plus, 
  Minus, 
  Search,
  Building2,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  History,
  AlertCircle
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  credits: number
  plan: 'FREE' | 'PREMIUM'
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  _count: {
    users: number
  }
}

interface CreditTransaction {
  id: string
  tenantId: string
  tenant: {
    name: string
  }
  amount: number
  type: 'ADD' | 'REMOVE' | 'USAGE'
  reason: string
  createdAt: string
  createdBy: {
    name: string
  }
}

export default function AdminCredits() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [transactionType, setTransactionType] = useState<'ADD' | 'REMOVE'>('ADD')
  const [formData, setFormData] = useState({
    amount: 0,
    reason: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tenantsResponse, transactionsResponse] = await Promise.all([
        fetch('/api/admin/credits/tenants'),
        fetch('/api/admin/credits/transactions')
      ])

      if (tenantsResponse.ok) {
        const tenantsData = await tenantsResponse.json()
        setTenants(tenantsData)
      }

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (tenant: Tenant, type: 'ADD' | 'REMOVE') => {
    setSelectedTenant(tenant)
    setTransactionType(type)
    setFormData({
      amount: 0,
      reason: ''
    })
    setIsModalOpen(true)
  }

  const handleSaveTransaction = async () => {
    if (!selectedTenant) return

    if (formData.amount <= 0) {
      toast.error('Quantidade deve ser maior que zero')
      return
    }

    if (!formData.reason.trim()) {
      toast.error('Motivo é obrigatório')
      return
    }

    if (transactionType === 'REMOVE' && formData.amount > selectedTenant.credits) {
      toast.error('Não é possível remover mais créditos do que o tenant possui')
      return
    }

    try {
      const response = await fetch('/api/admin/credits/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          amount: transactionType === 'REMOVE' ? -formData.amount : formData.amount,
          type: transactionType,
          reason: formData.reason
        })
      })

      if (response.ok) {
        toast.success(`Créditos ${transactionType === 'ADD' ? 'adicionados' : 'removidos'} com sucesso!`)
        setIsModalOpen(false)
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao processar transação')
      }
    } catch (error) {
      console.error('Erro ao salvar transação:', error)
      toast.error('Erro ao processar transação')
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCredits = tenants.reduce((sum, tenant) => sum + tenant.credits, 0)
  const activeTenantsWithCredits = tenants.filter(t => t.status === 'ACTIVE' && t.credits > 0).length

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Créditos</h1>
          <p className="text-gray-600 mt-2">Controle os créditos de WhatsApp e IA dos tenants</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Créditos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalCredits.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{activeTenantsWithCredits}</p>
                <p className="text-sm text-gray-500">com créditos</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transações Hoje</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {transactions.filter(t => 
                    new Date(t.createdAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <History className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar tenant por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Tenants List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenants e Créditos</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {tenant._count.users} usuários
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tenant.plan === 'PREMIUM' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tenant.plan}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tenant.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="flex items-center">
                        <Zap className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-lg font-bold text-gray-900">
                          {tenant.credits}
                        </span>
                      </div>
                      {tenant.credits < 10 && (
                        <div className="flex items-center text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Baixo
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(tenant, 'ADD')}
                        className="text-green-600 hover:text-green-700"
                        title="Adicionar créditos"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(tenant, 'REMOVE')}
                        className="text-red-600 hover:text-red-700"
                        disabled={tenant.credits === 0}
                        title="Remover créditos"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transações Recentes</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'ADD' 
                        ? 'bg-green-100' 
                        : transaction.type === 'REMOVE'
                        ? 'bg-red-100'
                        : 'bg-gray-100'
                    }`}>
                      {transaction.type === 'ADD' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : transaction.type === 'REMOVE' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <Zap className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.tenant.name}</p>
                      <p className="text-sm text-gray-500">{transaction.reason}</p>
                      <p className="text-xs text-gray-400">
                        por {transaction.createdBy.name} • {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right font-bold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                </div>
              ))}
              
              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Transaction Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
            <DialogHeader>
              <DialogTitle>
                {transactionType === 'ADD' ? 'Adicionar Créditos' : 'Remover Créditos'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTenant && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{selectedTenant.name}</p>
                      <p className="text-sm text-gray-500">
                        Créditos atuais: <span className="font-medium">{selectedTenant.credits}</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="amount">Quantidade</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    max={transactionType === 'REMOVE' ? selectedTenant.credits : undefined}
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                  {transactionType === 'REMOVE' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo: {selectedTenant.credits} créditos
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Input
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder={transactionType === 'ADD' ? 'Ex: Recarga mensal, Bônus...' : 'Ex: Ajuste, Reembolso...'}
                  />
                </div>
                
                {formData.amount > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Resultado:</strong> {selectedTenant.name} ficará com{' '}
                      <span className="font-bold">
                        {transactionType === 'ADD' 
                          ? selectedTenant.credits + formData.amount
                          : selectedTenant.credits - formData.amount
                        } créditos
                      </span>
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveTransaction}
                    className={transactionType === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  >
                    {transactionType === 'ADD' ? 'Adicionar' : 'Remover'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
