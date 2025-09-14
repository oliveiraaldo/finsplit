'use client'
import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { toast } from 'sonner'
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Users,
  CreditCard,
  Calendar,
  Crown,
  Zap,
  MessageSquare,
  Shield,
  AlertTriangle
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  type: 'BUSINESS' | 'FAMILY' | 'PERSONAL'
  plan: 'FREE' | 'PREMIUM'
  customPlan?: {
    name: string
    price: number
  }
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'
  hasWhatsApp: boolean
  credits: number
  maxGroups: number
  maxMembers: number
  createdAt: string
  _count: {
    users: number
    groups: number
  }
}

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  features: any
  maxGroups: number
  maxMembers: number
  hasWhatsApp: boolean
  creditsIncluded: number
}

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [plansLoading, setPlansLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    planId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
    hasWhatsApp: false,
    credits: 0,
    maxGroups: 5,
    maxMembers: 10
  })

  useEffect(() => {
    fetchTenants()
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setPlansLoading(true)
      const response = await fetch('/api/plans/available')
      if (response.ok) {
        const plansData = await response.json()
        setPlans(plansData)
      } else {
        toast.error('Erro ao carregar planos')
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setPlansLoading(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data)
      } else {
        toast.error('Erro ao carregar tenants')
      }
    } catch (error) {
      console.error('Erro ao buscar tenants:', error)
      toast.error('Erro ao carregar tenants')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = () => {
    setEditingTenant(null)
    const freePlan = plans.find(p => p.price === 0)
    setFormData({
      name: '',
      planId: freePlan?.id || '',
      status: 'ACTIVE',
      hasWhatsApp: freePlan?.hasWhatsApp || false,
      credits: freePlan?.creditsIncluded || 0,
      maxGroups: freePlan?.maxGroups || 5,
      maxMembers: freePlan?.maxMembers || 10
    })
    setIsModalOpen(true)
  }

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant)
    // Se tem customPlan, buscar pelo nome do plano ou usar o primeiro
    let planId = ''
    if (tenant.customPlan) {
      const foundPlan = plans.find(p => p.name === tenant.customPlan!.name)
      planId = foundPlan?.id || ''
    } else {
      // Buscar plano - primeiro tenta pelo planId, senão pela lógica antiga
      if (tenant.planId) {
        planId = tenant.planId
      } else {
        // Fallback para lógica antiga baseada no tipo (FREE/PREMIUM)
        const foundPlan = plans.find(p => 
          (tenant.plan === 'FREE' && p.price === 0) || 
          (tenant.plan === 'PREMIUM' && p.price > 0)
        )
        planId = foundPlan?.id || ''
      }
    }
    
    setFormData({
      name: tenant.name,
      planId: planId,
      status: tenant.status,
      hasWhatsApp: tenant.hasWhatsApp,
      credits: tenant.credits,
      maxGroups: tenant.maxGroups,
      maxMembers: tenant.maxMembers
    })
    setIsModalOpen(true)
  }

  const handleSaveTenant = async () => {
    if (!formData.planId) {
      toast.error('Selecione um plano')
      return
    }

    try {
      const url = editingTenant ? `/api/admin/tenants/${editingTenant.id}` : '/api/admin/tenants'
      const method = editingTenant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingTenant ? 'Tenant atualizado!' : 'Tenant criado!')
        setIsModalOpen(false)
        fetchTenants()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar tenant')
      }
    } catch (error) {
      console.error('Erro ao salvar tenant:', error)
      toast.error('Erro ao salvar tenant')
    }
  }

  const handleDeleteTenant = (tenant: Tenant) => {
    setTenantToDelete(tenant)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/admin/tenants/${tenantToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Tenant excluído com sucesso!')
        fetchTenants()
        setIsDeleteModalOpen(false)
        setTenantToDelete(null)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao excluir tenant')
      }
    } catch (error) {
      console.error('Erro ao excluir tenant:', error)
      toast.error('Erro ao excluir tenant')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = selectedPlan === 'all' || tenant.plan === selectedPlan
    const matchesStatus = selectedStatus === 'all' || tenant.status === selectedStatus
    return matchesSearch && matchesPlan && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Shield className="h-3 w-3 mr-1" />
      case 'SUSPENDED': return <AlertTriangle className="h-3 w-3 mr-1" />
      case 'CANCELLED': return <Trash2 className="h-3 w-3 mr-1" />
      default: return null
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Tenants</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as empresas do sistema</p>
          </div>
          <Button onClick={handleCreateTenant}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Tenant
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome da empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os planos</option>
                <option value="FREE">Gratuito</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <div className="w-full sm:w-40">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="SUSPENDED">Suspenso</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                    <div className="flex items-center mt-1">
                      {tenant.plan === 'PREMIUM' ? (
                        <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                      ) : (
                        <CreditCard className="h-4 w-4 text-gray-400 mr-1" />
                      )}
                      <span className="text-sm text-gray-600">
                        {tenant.planName || tenant.plan}
                        {tenant.planPrice && tenant.planPrice > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            - R$ {tenant.planPrice.toFixed(2)}/mês
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                  {getStatusIcon(tenant.status)}
                  {tenant.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Usuários
                  </div>
                  <span className="font-medium">{tenant._count.users}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    Grupos
                  </div>
                  <span className="font-medium">{tenant._count.groups}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Zap className="h-4 w-4 mr-2" />
                    Créditos
                  </div>
                  <span className="font-medium">{tenant.credits}</span>
                </div>

                {tenant.hasWhatsApp && (
                  <div className="flex items-center text-sm text-green-600">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp habilitado
                  </div>
                )}

                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  Criado em {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTenant(tenant)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTenant(tenant)}
                  className="text-red-600 hover:text-red-700"
                  disabled={tenant._count.users > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredTenants.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum tenant encontrado</p>
            </div>
          </Card>
        )}

        {/* Tenant Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTenant ? 'Editar Tenant' : 'Novo Tenant'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planId">Plano</Label>
                  {plansLoading ? (
                    <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                  ) : (
                    <select
                      id="planId"
                      value={formData.planId}
                      onChange={(e) => {
                        const selectedPlan = plans.find(p => p.id === e.target.value)
                        setFormData(prev => ({ 
                          ...prev, 
                          planId: e.target.value,
                          hasWhatsApp: selectedPlan?.hasWhatsApp || false,
                          credits: selectedPlan?.creditsIncluded || 0,
                          maxGroups: selectedPlan?.maxGroups || 5,
                          maxMembers: selectedPlan?.maxMembers || 10
                        }))
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um plano</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}/mês`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="SUSPENDED">Suspenso</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="credits">Créditos</Label>
                <Input
                  id="credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData(prev => ({ ...prev, credits: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxGroups">Máx. Grupos</Label>
                  <Input
                    id="maxGroups"
                    type="number"
                    value={formData.maxGroups}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxGroups: parseInt(e.target.value) || 0 }))}
                    placeholder="5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxMembers">Máx. Membros</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasWhatsApp"
                  checked={formData.hasWhatsApp}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasWhatsApp: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="hasWhatsApp">Habilitar WhatsApp</Label>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTenant}>
                  {editingTenant ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setTenantToDelete(null)
          }}
          onConfirm={confirmDeleteTenant}
          title="Excluir Tenant"
          description={`Você está prestes a excluir permanentemente o tenant "${tenantToDelete?.name}" e todos os seus dados relacionados.`}
          itemName={tenantToDelete?.name || ''}
          itemType="tenant"
          isLoading={isDeleting}
        />
      </div>
    </AdminLayout>
  )
}
