'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Users, Tag, MessageCircle, ArrowRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface Group {
  id: string
  name: string
  description: string | null
}

interface Category {
  id: string
  name: string
  color: string
}

export default function WelcomeWizardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // Estados para criação
  const [newGroupName, setNewGroupName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6')

  useEffect(() => {
    if (session) {
      fetchUserData()
    }
  }, [session])

  const fetchUserData = async () => {
    try {
      // Buscar grupos existentes
      const groupsResponse = await fetch('/api/dashboard/groups')
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setGroups(groupsData)
      }

      // Buscar categorias existentes
      const categoriesResponse = await fetch('/api/dashboard/categories')
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Digite um nome para o grupo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: 'Criado no assistente de configuração inicial'
        })
      })

      if (response.ok) {
        const newGroup = await response.json()
        setGroups([...groups, newGroup])
        setNewGroupName('')
        toast.success('Grupo criado com sucesso!')
      } else {
        throw new Error('Erro ao criar grupo')
      }
    } catch (error) {
      toast.error('Erro ao criar grupo')
    } finally {
      setLoading(false)
    }
  }

  const createCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Digite um nome para a categoria')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/dashboard/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCategoryName,
          color: newCategoryColor
        })
      })

      if (response.ok) {
        const newCategory = await response.json()
        setCategories([...categories, newCategory])
        setNewCategoryName('')
        toast.success('Categoria criada com sucesso!')
      } else {
        throw new Error('Erro ao criar categoria')
      }
    } catch (error) {
      toast.error('Erro ao criar categoria')
    } finally {
      setLoading(false)
    }
  }

  const finishWizard = () => {
    toast.success('Configuração concluída! Bem-vindo ao FinSplit! 🎉')
    router.push('/dashboard')
  }

  const steps = [
    {
      number: 1,
      title: 'Grupos de Despesas',
      description: 'Crie grupos para organizar suas finanças',
      icon: Users
    },
    {
      number: 2,
      title: 'Categorias',
      description: 'Defina categorias para classificar gastos',
      icon: Tag
    },
    {
      number: 3,
      title: 'WhatsApp',
      description: 'Verifique sua integração',
      icon: MessageCircle
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao FinSplit! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Vamos configurar sua conta em alguns passos simples
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
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              {React.createElement(steps[currentStep - 1].icon, {
                className: "w-12 h-12 text-primary-600"
              })}
            </div>
            <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
            <CardDescription className="text-lg">
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Grupos */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Seus grupos atuais:</h3>
                  <div className="grid gap-3 mb-6">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-primary-600 mr-3" />
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          {group.description && (
                            <p className="text-sm text-gray-600">{group.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Criar novo grupo:</h3>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Nome do grupo (ex: Viagem, Casa, Empresa)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={createGroup} disabled={loading}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    💡 <strong>Dica:</strong> Crie grupos para diferentes contextos: 
                    "Casa", "Viagem Rio", "Empresa", "Amigos". Cada grupo terá suas próprias despesas e relatórios.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Categorias */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Suas categorias atuais:</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Criar nova categoria:</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Input
                        placeholder="Nome da categoria (ex: Restaurante, Combustível)"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                      />
                      <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                    <Button onClick={createCategory} disabled={loading} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Categoria
                    </Button>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800">
                    🎯 <strong>Dica:</strong> Categorias ajudam a organizar e analisar seus gastos. 
                    Crie categorias como "Alimentação", "Transporte", "Lazer" para ter relatórios mais detalhados.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: WhatsApp */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <MessageCircle className="w-10 h-10 text-green-600" />
                  </div>
                  
                  <h3 className="text-xl font-semibold">Verifique seu WhatsApp! 📱</h3>
                  
                  <div className="bg-green-50 p-6 rounded-lg">
                    <p className="text-green-800 mb-4">
                      ✅ Se você cadastrou um telefone, enviamos uma mensagem de boas-vindas!
                    </p>
                    <p className="text-green-700">
                      Agora você pode enviar recibos direto pelo WhatsApp e nossa IA vai organizar tudo automaticamente!
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <p className="text-blue-800 text-sm">
                      <strong>💡 Não recebeu a mensagem?</strong> Verifique se digitou o telefone correto nas configurações ou entre em contato conosco.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Como usar o WhatsApp:</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Envie fotos de recibos/notas fiscais</li>
                    <li>• Digite "saldo" para ver seus saldos</li>
                    <li>• Digite "grupos" para gerenciar grupos</li>
                    <li>• Digite "ajuda" para ver todos os comandos</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
              >
                Anterior
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={finishWizard}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Finalizar Configuração
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700"
          >
            Pular configuração (pode fazer depois)
          </Button>
        </div>
      </div>
    </div>
  )
}
