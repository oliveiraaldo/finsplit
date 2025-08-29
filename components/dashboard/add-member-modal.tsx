'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, X, Mail, User } from 'lucide-react'

interface AddMemberModalProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
  onMemberAdded: (member: any) => void
}

export function AddMemberModal({ 
  groupId, 
  isOpen, 
  onClose, 
  onMemberAdded 
}: AddMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'MEMBER',
    permission: 'VIEW_ONLY'
  })

  const handleSave = async () => {
    // Validar dados antes de enviar
    if (!formData.name?.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (!formData.email?.trim() && !formData.phone?.trim()) {
      toast.error('Email ou telefone é obrigatório')
      return
    }

    setIsLoading(true)
    try {
      const dataToSend = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        role: formData.role,
        permission: formData.permission
      }

      console.log('👥 Adicionando membro:', dataToSend)

      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const newMember = await response.json()
        console.log('✅ Membro adicionado:', newMember)
        onMemberAdded(newMember)
        onClose()
        // Limpar formulário
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: 'MEMBER',
          permission: 'VIEW_ONLY'
        })
        toast.success('Membro adicionado com sucesso!')
      } else {
        const errorData = await response.text()
        console.error('❌ Erro na resposta:', errorData)
        toast.error('Erro ao adicionar membro')
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar membro:', error)
      toast.error('Erro ao adicionar membro')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Adicionar Membro
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+55 11 99999-9999"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              Email ou telefone é obrigatório
            </p>
          </div>

          {/* Função */}
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={isLoading}
            >
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </div>

          {/* Permissões */}
          <div className="space-y-2">
            <Label htmlFor="permission">Permissões</Label>
            <Select
              value={formData.permission}
              onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
              disabled={isLoading}
            >
              <option value="VIEW_ONLY">Somente visualizar</option>
              <option value="FULL_ACCESS">Visualizar, editar e apagar</option>
            </Select>
            <p className="text-xs text-gray-500">
              Define o que o membro pode fazer com as despesas do grupo
            </p>
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
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
