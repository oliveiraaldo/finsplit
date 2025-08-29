'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Receipt, 
  Plus, 
  ArrowLeft,
  UserPlus,
  Settings,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { AddMemberModal } from '@/components/dashboard/add-member-modal'

interface GroupMember {
  id: string
  name: string
  role: string
  balance: number
}

interface GroupExpense {
  id: string
  description: string
  amount: number
  date: string
  status: string
  paidBy: string
  category?: string
}

interface GroupDetails {
  id: string
  name: string
  description: string
  members: GroupMember[]
  expenses: GroupExpense[]
  totalExpenses: number
  averagePerPerson: number
}

export default function GroupDetailsPage() {
  const params = useParams()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<GroupDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'members'>('overview')
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`)
        if (response.ok) {
          const data = await response.json()
          setGroup(data)
        } else {
          console.error('Erro ao buscar detalhes do grupo:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar grupo:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (groupId) {
      fetchGroupDetails()
    }
  }, [groupId])

  const handleMemberAdded = (newMember: any) => {
    if (group) {
      setGroup({
        ...group,
        members: [...group.members, newMember]
      })
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Grupo não encontrado</h2>
          <p className="text-gray-600 mb-6">O grupo que você está procurando não existe ou foi removido.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
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
            <Link href="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-gray-600 mt-2">{group.description}</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setIsAddMemberModalOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Membro
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {group.totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{group.members.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Média por Pessoa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {group.averagePerPerson.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Membros
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Saldos dos Membros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Saldos dos Membros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                        </div>
                      </div>
                      <div className={`text-right font-semibold ${
                        member.balance > 0 ? 'text-green-600' : 
                        member.balance < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {member.balance > 0 ? '+' : ''}R$ {member.balance.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Despesas Recentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Despesas Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{expense.description}</div>
                        <div className="text-xs text-gray-500">
                          {expense.paidBy} • {new Date(expense.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">R$ {expense.amount.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 capitalize">{expense.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {group.expenses.length > 5 && (
                  <div className="mt-4 text-center">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Ver todas as despesas →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'expenses' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lista de Despesas</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Despesa
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{expense.description}</div>
                      <div className="text-sm text-gray-500">
                        Pago por {expense.paidBy} • {new Date(expense.date).toLocaleDateString('pt-BR')}
                        {expense.category && ` • ${expense.category}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">R$ {expense.amount.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 capitalize">{expense.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'members' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Membros do Grupo</span>
                <Button onClick={() => setIsAddMemberModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Membro
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{member.role}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`text-right ${
                        member.balance > 0 ? 'text-green-600' : 
                        member.balance < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <div className="font-semibold">
                          {member.balance > 0 ? '+' : ''}R$ {member.balance.toFixed(2)}
                        </div>
                        <div className="text-xs">
                          {member.balance > 0 ? 'Deve receber' : 
                           member.balance < 0 ? 'Deve pagar' : 'Em dia'}
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Adicionar Membro */}
      <AddMemberModal
        groupId={groupId}
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onMemberAdded={handleMemberAdded}
      />
    </DashboardLayout>
  )
} 