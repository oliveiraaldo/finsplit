'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Users, 
  Plus, 
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react'
import Link from 'next/link'
import { GroupEditModal } from '@/components/dashboard/group-edit-modal'

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  totalExpenses: number
  lastActivity: string
  memberNames: string[]
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/dashboard/groups')
        if (response.ok) {
          const data = await response.json()
          setGroups(data)
          setFilteredGroups(data)
        } else {
          console.error('Erro ao buscar grupos:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [])

  // Filtrar grupos baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGroups(groups)
    } else {
      const filtered = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredGroups(filtered)
    }
  }, [searchTerm, groups])

  const handleEditGroup = (group: Group) => {
    console.log('✏️ Editando grupo:', group.id)
    setSelectedGroup(group)
    setIsEditModalOpen(true)
  }

  const handleUpdateGroup = (updatedGroup: any) => {
    console.log('🔄 Atualizando grupo na lista:', updatedGroup)
    setGroups(groups.map(g => 
      g.id === updatedGroup.id ? {
        ...g,
        name: updatedGroup.name,
        description: updatedGroup.description
      } : g
    ))
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setGroups(groups.filter(g => g.id !== groupId))
        toast.success('Grupo excluído com sucesso')
      } else {
        toast.error('Erro ao excluir grupo')
      }
    } catch (error) {
      toast.error('Erro ao excluir grupo')
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
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
            <h1 className="text-3xl font-bold text-gray-900">Meus Grupos</h1>
            <p className="text-gray-600 mt-2">Gerencie todos os seus grupos de despesas</p>
          </div>
          
          <Link href="/dashboard/groups/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Grupo
            </Button>
          </Link>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Membros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {groups.reduce((sum, group) => sum + group.memberCount, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {groups.reduce((sum, group) => sum + group.totalExpenses, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Grupos */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{group.name}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {group.description || 'Sem descrição'}
                      </p>
                    </div>
                    
                    <div className="relative group">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="py-1">
                          <Link href={`/dashboard/groups/${group.id}`}>
                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Ver Detalhes
                            </button>
                          </Link>
                          <button 
                            onClick={() => handleEditGroup(group)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteGroup(group.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Membros:</span>
                      <span className="font-medium">{group.memberCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-semibold">R$ {group.totalExpenses.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Ativo em:</span>
                      <span className="text-gray-600">
                        {new Date(group.lastActivity).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    {group.memberNames.length > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Membros:</p>
                        <div className="flex flex-wrap gap-1">
                          {group.memberNames.slice(0, 3).map((name, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                              {name}
                            </span>
                          ))}
                          {group.memberNames.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                              +{group.memberNames.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link href={`/dashboard/groups/${group.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo encontrado</h3>
            <p className="text-gray-600 mb-4">
              Não encontramos grupos que correspondam a "{searchTerm}"
            </p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Limpar busca
            </Button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo criado</h3>
            <p className="text-gray-600 mb-6">
              Crie seu primeiro grupo para começar a organizar despesas
            </p>
            <Link href="/dashboard/groups/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Grupo
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <GroupEditModal
        group={selectedGroup}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedGroup(null)
        }}
        onUpdate={handleUpdateGroup}
      />
    </DashboardLayout>
  )
} 