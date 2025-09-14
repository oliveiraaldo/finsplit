'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InternationalPhoneInput } from '@/components/ui/international-phone-input'
import { CheckCircle, Users, Tag, ArrowRight, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface OnboardingStep {
  number: number
  title: string
  description: string
  icon: React.ComponentType<any>
}

const steps: OnboardingStep[] = [
  { number: 1, title: 'Criar Conta', description: 'Seus dados básicos', icon: Users },
  { number: 2, title: 'Primeiro Grupo', description: 'Organize suas despesas', icon: Users },
  { number: 3, title: 'Primeira Categoria', description: 'Classifique seus gastos', icon: Tag }
]

const groupSuggestions = [
  { name: 'Grupo Principal', type: 'PERSONAL' },
  { name: 'Família', type: 'FAMILY' },
  { name: 'Viagem Amigos', type: 'PERSONAL' },
  { name: 'Empresa', type: 'BUSINESS' }
]

const categorySuggestions = [
  { name: 'Alimentação', color: '#FF6B6B' },
  { name: 'Transporte', color: '#4ECDC4' },
  { name: 'Moradia', color: '#45B7D1' },
  { name: 'Saúde', color: '#96CEB4' },
  { name: 'Lazer', color: '#FFEAA7' },
  { name: 'Serviços', color: '#DDA0DD' }
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [onboardingToken, setOnboardingToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [groupData, setGroupData] = useState({
    name: 'Grupo Principal',
    type: 'PERSONAL'
  })
  const [categoryData, setCategoryData] = useState({
    name: 'Alimentação',
    color: '#FF6B6B'
  })

  useEffect(() => {
    // Pegar token da URL se disponível
    const token = searchParams.get('token')
    if (token) {
      setOnboardingToken(token)
    }

    // Pré-preencher telefone se vier da URL
    const phone = searchParams.get('phone')
    if (phone) {
      setFormData(prev => ({ ...prev, phone: decodeURIComponent(phone) }))
    }
  }, [searchParams])

  const handleCreateAccount = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Preencha nome e email')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          onboardingToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUserId(data.userId)
        setOnboardingToken(data.updatedToken)
        toast.success('✅ Conta criada! Vamos criar seu primeiro grupo.')
        setCurrentStep(2)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar conta')
      }
    } catch (error) {
      toast.error('Erro interno. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupData.name) {
      toast.error('Digite um nome para o grupo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/create-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...groupData,
          onboardingToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGroupId(data.groupId)
        setOnboardingToken(data.updatedToken)
        toast.success(`✅ Grupo "${groupData.name}" criado!`)
        setCurrentStep(3)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar grupo')
      }
    } catch (error) {
      toast.error('Erro interno. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryData.name) {
      toast.error('Selecione uma categoria')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/create-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryData,
          groupId,
          onboardingToken
        })
      })

      if (response.ok) {
        const data = await response.json()
        setOnboardingToken(data.updatedToken)
        toast.success(`✅ Categoria "${categoryData.name}" criada!`)
        setCurrentStep(4) // Mostrar tela de retorno ao WhatsApp
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao criar categoria')
      }
    } catch (error) {
      toast.error('Erro interno. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const getWhatsAppLink = (isMobile: boolean) => {
    const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999'
    const message = `Voltei do cadastro ✅ (token: ${onboardingToken?.slice(-8)})`
    const encodedMessage = encodeURIComponent(message)
    
    if (isMobile) {
      return `whatsapp://send?phone=${phone}&text=${encodedMessage}`
    } else {
      return `https://wa.me/${phone}/?text=${encodedMessage}`
    }
  }

  const detectDevice = () => {
    if (typeof window === 'undefined') return 'desktop'
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone') ? 'mobile' : 'desktop'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao FinSplit! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Em 1 minuto você estará pronto para lançar despesas
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    step.number
                  )}
                </div>
                {step.number < steps.length && (
                  <div className={`w-12 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0">
          {/* Passo 1: Criar Conta */}
          {currentStep === 1 && (
            <>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <Users className="w-12 h-12 text-primary-600" />
                </div>
                <CardTitle className="text-2xl">Criar sua conta</CardTitle>
                <CardDescription className="text-lg">
                  Seus dados básicos para começar
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <InternationalPhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData({...formData, phone: value})}
                  label="WhatsApp (recomendado)"
                />
                
                <Button 
                  onClick={handleCreateAccount} 
                  disabled={loading} 
                  className="w-full h-12 text-lg bg-primary-600 hover:bg-primary-700 mt-6"
                >
                  {loading ? 'Criando conta...' : 'Criar minha conta'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Passo 2: Criar Grupo */}
          {currentStep === 2 && (
            <>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <Users className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Criar seu primeiro grupo</CardTitle>
                <CardDescription className="text-lg">
                  Para organizar suas despesas
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label>Sugestões de grupos</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {groupSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => setGroupData(suggestion)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          groupData.name === suggestion.name
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="groupName">Nome personalizado</Label>
                  <Input
                    id="groupName"
                    value={groupData.name}
                    onChange={(e) => setGroupData({...groupData, name: e.target.value})}
                    placeholder="Nome do seu grupo"
                  />
                </div>
                
                <Button 
                  onClick={handleCreateGroup} 
                  disabled={loading} 
                  className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Criando grupo...' : 'Criar grupo'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Passo 3: Criar Categoria */}
          {currentStep === 3 && (
            <>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <Tag className="w-12 h-12 text-purple-600" />
                </div>
                <CardTitle className="text-2xl">Primeira categoria</CardTitle>
                <CardDescription className="text-lg">
                  Para classificar seus gastos
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div>
                  <Label>Categorias sugeridas</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {categorySuggestions.map((suggestion) => (
                      <button
                        key={suggestion.name}
                        onClick={() => setCategoryData(suggestion)}
                        className={`p-3 rounded-lg border text-left transition-all flex items-center ${
                          categoryData.name === suggestion.name
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: suggestion.color }}
                        />
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateCategory} 
                  disabled={loading} 
                  className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Criando categoria...' : 'Criar categoria'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </>
          )}

          {/* Passo 4: Retorno ao WhatsApp */}
          {currentStep === 4 && (
            <>
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-4">
                  <MessageCircle className="w-12 h-12 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Pronto! 🎉</CardTitle>
                <CardDescription className="text-lg">
                  Agora volte ao WhatsApp para mandar seu primeiro recibo
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">✅ Configuração concluída!</h3>
                  <ul className="text-green-800 space-y-1">
                    <li>• Conta criada</li>
                    <li>• Grupo "{groupData.name}" criado</li>
                    <li>• Categoria "{categoryData.name}" criada</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-center">Voltar ao WhatsApp:</h3>
                  
                  <div className="space-y-3">
                    <a 
                      href={getWhatsAppLink(true)}
                      className="w-full"
                      onClick={() => toast.success('Abrindo WhatsApp mobile...')}
                    >
                      <Button variant="outline" className="w-full h-12 text-lg border-2 border-green-500 text-green-700 hover:bg-green-50">
                        📱 WhatsApp (Mobile)
                      </Button>
                    </a>
                    
                    <a 
                      href={getWhatsAppLink(false)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                      onClick={() => toast.success('Abrindo WhatsApp Web...')}
                    >
                      <Button variant="outline" className="w-full h-12 text-lg border-2 border-green-500 text-green-700 hover:bg-green-50">
                        💻 WhatsApp Web (Desktop)
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Dica:</strong> Tire uma foto nítida do recibo/nota fiscal e envie no WhatsApp. 
                    A IA extrai os dados automaticamente e você só confirma.
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
