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
  Users, 
  Search,
  Building2,
  Calendar,
  Crown,
  Trash2,
  Edit,
  AlertTriangle,
  UserPlus,
  DollarSign
} from 'lucide-react'

interface Group {
  id: string
  name: string
  createdAt: string
  tenant: {
    name: string
  }
  ownerTenant?: {
    name: string
  }
  members: {
    id: string
    role: string
    user: {
      name: string
      email: string
    }
  }[]
  _count: {
    expenses: number
  }
}

export default function AdminGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/admin/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      } else {
        toast.error('Erro ao carregar grupos')
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
      toast.error('Erro ao carregar grupos')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return

    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Grupo excluído com sucesso!')
        setIsDeleteModalOpen(false)
        fetchGroups()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao excluir grupo')
      }
    } catch (error) {
      console.error('Erro ao excluir grupo:', error)
      toast.error('Erro ao excluir grupo')
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalGroups = groups.length
  const groupsWithMembers = groups.filter(g => g.members.length > 0).length
  const orphanGroups = groups.filter(g => g.members.length === 0).length
  const groupsWithExpenses = groups.filter(g => g._count.expenses > 0).length

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Grupos</h1>
          <p className="text-gray-600 mt-2">Visualize e gerencie todos os grupos do sistema</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Grupos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalGroups}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Membros</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{groupsWithMembers}</p>
                <p className="text-sm text-green-600">ativos</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Órfãos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{orphanGroups}</p>
                <p className="text-sm text-red-600">sem membros</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Despesas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{groupsWithExpenses}</p>
                <p className="text-sm text-purple-600">ativas</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar grupo por nome ou tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Groups List */}
        <Card className="p-6">
          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.id} className={`p-4 border rounded-lg ${
                group.members.length === 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        group.members.length === 0 ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <Users className={`h-4 w-4 ${
                          group.members.length === 0 ? 'text-red-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center">
                          {group.name}
                          {group.members.length === 0 && (
                            <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                          )}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {group.tenant.name}
                          </span>
                          {group.ownerTenant && (
                            <span className="flex items-center">
                              <Crown className="h-3 w-3 mr-1" />
                              Owner: {group.ownerTenant.name}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {group.members.length} membros
                      </div>
                      <div className="text-sm text-gray-500">
                        {group._count.expenses} despesas
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group)
                          setIsDeleteModalOpen(true)
                        }}
                        className="text-red-600 hover:text-red-700"
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                {group.members.length > 0 && (
                  <div className="mt-3 pl-11">
                    <div className="text-xs text-gray-500 mb-2">Membros:</div>
                    <div className="flex flex-wrap gap-2">
                      {group.members.map((member) => (
                        <div key={member.id} className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded text-xs">
                          <span>{member.user.name}</span>
                          <span className={`px-1 rounded text-xs ${
                            member.role === 'OWNER' 
                              ? 'bg-yellow-200 text-yellow-800' 
                              : member.role === 'ADMIN'
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum grupo encontrado</p>
              </div>
            )}
          </div>
        </Card>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Confirmar Exclusão
              </DialogTitle>
            </DialogHeader>
            
            {selectedGroup && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    Você está prestes a excluir o grupo:
                  </p>
                  <p className="font-medium text-red-900 mt-1">
                    {selectedGroup.name}
                  </p>
                  <div className="text-xs text-red-700 mt-2">
                    <p>• Tenant: {selectedGroup.tenant.name}</p>
                    <p>• Membros: {selectedGroup.members.length}</p>
                    <p>• Despesas: {selectedGroup._count.expenses}</p>
                  </div>
                </div>
                
                {selectedGroup._count.expenses > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>Atenção:</strong> Este grupo possui {selectedGroup._count.expenses} despesas.
                      Todas as despesas serão excluídas junto com o grupo.
                    </p>
                  </div>
                )}
                
                <p className="text-sm text-gray-600">
                  Esta ação não pode ser desfeita. Tem certeza que deseja continuar?
                </p>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleDeleteGroup}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Excluir Grupo
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
