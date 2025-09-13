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
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  Crown,
  Users,
  Building2,
  MessageSquare,
  Zap,
  Check,
  X,
  DollarSign
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  type: 'FREE' | 'PREMIUM'
  price: number
  description: string
  features: string[]
  maxGroups: number
  maxMembers: number
  hasWhatsApp: boolean
  creditsIncluded: number
  isActive: boolean
  createdAt: string
  _count: {
    tenants: number
  }
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'FREE' as 'FREE' | 'PREMIUM',
    price: 0,
    description: '',
    features: [''],
    maxGroups: 5,
    maxMembers: 10,
    hasWhatsApp: false,
    creditsIncluded: 0,
    isActive: true
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      } else {
        toast.error('Erro ao carregar planos')
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      type: 'FREE',
      price: 0,
      description: '',
      features: [''],
      maxGroups: 5,
      maxMembers: 10,
      hasWhatsApp: false,
      creditsIncluded: 0,
      isActive: true
    })
    setIsModalOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      description: plan.description,
      features: plan.features.length > 0 ? plan.features : [''],
      maxGroups: plan.maxGroups,
      maxMembers: plan.maxMembers,
      hasWhatsApp: plan.hasWhatsApp,
      creditsIncluded: plan.creditsIncluded,
      isActive: plan.isActive
    })
    setIsModalOpen(true)
  }

  const handleSavePlan = async () => {
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans'
      const method = editingPlan ? 'PUT' : 'POST'
      
      // Filtrar features vazias
      const filteredFeatures = formData.features.filter(f => f.trim() !== '')
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          features: filteredFeatures
        })
      })

      if (response.ok) {
        toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!')
        setIsModalOpen(false)
        fetchPlans()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar plano')
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error)
      toast.error('Erro ao salvar plano')
    }
  }

  const handleDeletePlan = async (plan: Plan) => {
    if (plan._count.tenants > 0) {
      toast.error('Não é possível excluir plano com tenants ativos')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Plano excluído!')
        fetchPlans()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao excluir plano')
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error)
      toast.error('Erro ao excluir plano')
    }
  }

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.map((f, i) => i === index ? value : f)
    }))
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Gerenciar Planos</h1>
            <p className="text-gray-600 mt-2">Configure os planos disponíveis no sistema</p>
          </div>
          <Button onClick={handleCreatePlan}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`p-6 relative ${plan.type === 'PREMIUM' ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-white' : ''}`}>
              {plan.type === 'PREMIUM' && (
                <div className="absolute -top-2 -right-2">
                  <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 && <span className="text-gray-600 ml-1">/mês</span>}
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    Grupos
                  </div>
                  <span className="font-medium">
                    {plan.maxGroups === -1 ? 'Ilimitado' : plan.maxGroups}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    Membros
                  </div>
                  <span className="font-medium">
                    {plan.maxMembers === -1 ? 'Ilimitado' : plan.maxMembers}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <Zap className="h-4 w-4 mr-2" />
                    Créditos
                  </div>
                  <span className="font-medium">{plan.creditsIncluded}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </div>
                  {plan.hasWhatsApp ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>

              {plan.features.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Recursos:</h4>
                  <ul className="space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <Check className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{plan._count.tenants} tenants usando</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  plan.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {plan.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPlan(plan)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePlan(plan)}
                  className="text-red-600 hover:text-red-700"
                  disabled={plan._count.tenants > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum plano encontrado</p>
            </div>
          </Card>
        )}

        {/* Plan Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do plano"
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'FREE' | 'PREMIUM' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FREE">Gratuito</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do plano"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="creditsIncluded">Créditos Inclusos</Label>
                  <Input
                    id="creditsIncluded"
                    type="number"
                    value={formData.creditsIncluded}
                    onChange={(e) => setFormData(prev => ({ ...prev, creditsIncluded: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxGroups">Máx. Grupos (-1 = ilimitado)</Label>
                  <Input
                    id="maxGroups"
                    type="number"
                    value={formData.maxGroups}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxGroups: parseInt(e.target.value) || 0 }))}
                    placeholder="5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxMembers">Máx. Membros (-1 = ilimitado)</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Recursos do Plano</Label>
                {formData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="Descreva um recurso..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                      className="text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Recurso
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
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
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="isActive">Plano Ativo</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan}>
                  {editingPlan ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
