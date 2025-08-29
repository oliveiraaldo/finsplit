'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { Save, X, Settings, User, Shield, Eye } from 'lucide-react'

interface EditMemberModalProps {
  groupId: string
  member: any | null
  isOpen: boolean
  onClose: () => void
  onMemberUpdated: (member: any) => void
}

export function EditMemberModal({ 
  groupId, 
  member, 
  isOpen, 
  onClose, 
  onMemberUpdated 
}: EditMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    role: 'MEMBER',
    permission: 'VIEW_ONLY'
  })

  useEffect(() => {
    if (member) {
      setFormData({
        role: member.role || 'MEMBER',
        permission: member.permission || 'VIEW_ONLY'
      })
    }
  }, [member])

  const handleSave = async () => {
    if (!member) return

    setIsLoading(true)
    try {
      const dataToSend = {
        role: formData.role,
        permission: formData.permission
      }

      console.log('👤 Atualizando membro:', { memberId: member.id, ...dataToSend })

      const response = await fetch(`/api/groups/${groupId}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const updatedMember = await response.json()
        console.log('✅ Membro atualizado:', updatedMember)
        onMemberUpdated(updatedMember)
        onClose()
        toast.success('Permissões atualizadas com sucesso!')
      } else {
        const errorData = await response.text()
        console.error('❌ Erro na resposta:', errorData)
        toast.error('Erro ao atualizar permissões')
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar membro:', error)
      toast.error('Erro ao atualizar permissões')
    } finally {
      setIsLoading(false)
    }
  }

  if (!member) return null

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Shield className="h-4 w-4 text-yellow-600" />
      case 'ADMIN': return <User className="h-4 w-4 text-blue-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'FULL_ACCESS': return <Settings className="h-4 w-4 text-green-600" />
      default: return <Eye className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Editar Permissões
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Membro */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">
                  {member.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-500">{member.email || member.phone}</div>
              </div>
            </div>
          </div>

          {/* Função */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              {getRoleIcon(formData.role)}
              Função no Grupo
            </Label>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={isLoading || member.role === 'OWNER'} // Owner não pode ter função alterada
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Administrador</option>
              {member.role === 'OWNER' && <option value="OWNER">Proprietário</option>}
            </Select>
            {member.role === 'OWNER' && (
              <p className="text-xs text-yellow-600">
                💡 Proprietários não podem ter sua função alterada
              </p>
            )}
          </div>

          {/* Permissões para Despesas */}
          <div className="space-y-2">
            <Label htmlFor="permission" className="flex items-center gap-2">
              {getPermissionIcon(formData.permission)}
              Permissões para Despesas
            </Label>
            <Select
              value={formData.permission}
              onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
              disabled={isLoading}
            >
              <option value="VIEW_ONLY">Somente visualizar</option>
              <option value="FULL_ACCESS">Visualizar, editar e apagar</option>
            </Select>
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Somente visualizar:</strong> Pode ver despesas e editar apenas as próprias</p>
              <p><strong>Controle total:</strong> Pode criar, editar e excluir qualquer despesa</p>
            </div>
          </div>

          {/* Resumo de Permissões */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Resumo das Permissões
            </h4>
            <div className="text-xs space-y-1">
              {(formData.role === 'ADMIN' || formData.role === 'OWNER') && (
                <p className="text-green-600">✅ Pode adicionar/remover membros</p>
              )}
              {(formData.role === 'ADMIN' || formData.role === 'OWNER') && (
                <p className="text-green-600">✅ Pode editar configurações do grupo</p>
              )}
              {formData.permission === 'FULL_ACCESS' ? (
                <p className="text-green-600">✅ Controle total sobre despesas</p>
              ) : (
                <p className="text-yellow-600">⚠️ Pode editar apenas as próprias despesas</p>
              )}
              {formData.role === 'OWNER' && (
                <p className="text-blue-600">👑 Proprietário do grupo (paga pelo plano)</p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
