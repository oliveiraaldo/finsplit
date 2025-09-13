'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

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

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    tenantName: '',
    tenantType: 'BUSINESS',
    planId: ''
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [plansLoading, setPlansLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan')

  useEffect(() => {
    fetchPlans()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans/available')
      if (response.ok) {
        const plansData = await response.json()
        setPlans(plansData)
        
        // Se há um plano na URL ou se só há um plano gratuito, selecionar automaticamente
        if (planParam === 'premium') {
          const premiumPlan = plansData.find((p: Plan) => p.price > 0)
          if (premiumPlan) {
            setFormData(prev => ({ ...prev, planId: premiumPlan.id }))
          }
        } else {
          // Selecionar o primeiro plano gratuito por padrão
          const freePlan = plansData.find((p: Plan) => p.price === 0)
          if (freePlan) {
            setFormData(prev => ({ ...prev, planId: freePlan.id }))
          }
        }
      } else {
        toast.error('Erro ao carregar planos')
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error)
      toast.error('Erro ao carregar planos')
    } finally {
      setPlansLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Conta criada com sucesso!')
        router.push('/auth/signin')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar conta')
      }
    } catch (error) {
      toast.error('Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Criar Conta FinSplit</CardTitle>
          <CardDescription>
            {planParam === 'premium' ? 'Plano Premium selecionado' : 'Comece gratuitamente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Seu nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+55 11 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="tenantType">Tipo de Organização</Label>
              <Select 
                value={formData.tenantType} 
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, tenantType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUSINESS">🏢 Empresa/Negócio</SelectItem>
                  <SelectItem value="FAMILY">🏠 Família/Residencial</SelectItem>
                  <SelectItem value="PERSONAL">👤 Pessoal/Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tenantName">
                {formData.tenantType === 'BUSINESS' ? 'Nome da Empresa' : 
                 formData.tenantType === 'FAMILY' ? 'Nome da Família/Casa' : 
                 'Nome do Grupo'}
              </Label>
              <Input
                id="tenantName"
                name="tenantName"
                type="text"
                value={formData.tenantName}
                onChange={handleChange}
                required
                placeholder={
                  formData.tenantType === 'BUSINESS' ? 'Ex: Minha Empresa Ltda' : 
                  formData.tenantType === 'FAMILY' ? 'Ex: Família Silva, Casa da Praia' : 
                  'Ex: Meus Gastos Pessoais'
                }
              />
            </div>

            <div>
              <Label htmlFor="planId">Plano</Label>
              {plansLoading ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              ) : (
                <Select 
                  value={formData.planId} 
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, planId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              plan.price === 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}/mês`}
                            </span>
                            <span className="font-medium">{plan.name}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formData.planId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  {(() => {
                    const selectedPlan = plans.find(p => p.id === formData.planId)
                    if (!selectedPlan) return null
                    
                    return (
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">{selectedPlan.name}</p>
                        {selectedPlan.description && (
                          <p className="text-blue-700 mt-1">{selectedPlan.description}</p>
                        )}
                        <div className="mt-2 space-y-1 text-blue-600">
                          <p>• {selectedPlan.maxGroups === -1 ? 'Grupos ilimitados' : `${selectedPlan.maxGroups} grupos`}</p>
                          <p>• {selectedPlan.maxMembers === -1 ? 'Membros ilimitados' : `${selectedPlan.maxMembers} membros por grupo`}</p>
                          {selectedPlan.hasWhatsApp && <p>• WhatsApp integrado</p>}
                          {selectedPlan.creditsIncluded > 0 && <p>• {selectedPlan.creditsIncluded} créditos inclusos</p>}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/auth/signin" className="text-primary-600 hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 