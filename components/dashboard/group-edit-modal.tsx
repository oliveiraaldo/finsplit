'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, X, Users } from 'lucide-react'

interface GroupEditModalProps {
  group: any | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (group: any) => void
}

export function GroupEditModal({ 
  group, 
  isOpen, 
  onClose, 
  onUpdate 
}: GroupEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        description: group.description || ''
      })
    }
  }, [group])

  const handleSave = async () => {
    if (!group) return

    // Validar dados antes de enviar
    if (!formData.name?.trim()) {
      toast.error('Nome do grupo é obrigatório')
      return
    }

    setIsLoading(true)
    try {
      const dataToSend = {
        name: formData.name.trim(),
        description: formData.description.trim()
      }

      console.log('💾 Salvando grupo:', dataToSend)

      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const updatedGroup = await response.json()
        console.log('✅ Grupo atualizado:', updatedGroup)
        onUpdate(updatedGroup)
        onClose()
        toast.success('Grupo atualizado com sucesso!')
      } else {
        const errorData = await response.text()
        console.error('❌ Erro na resposta:', errorData)
        toast.error('Erro ao atualizar grupo')
      }
    } catch (error) {
      console.error('❌ Erro ao salvar:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsLoading(false)
    }
  }

  if (!group) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Editar Grupo
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
          {/* Nome do Grupo */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Grupo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome do grupo"
              disabled={isLoading}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o propósito do grupo (opcional)"
              rows={3}
              disabled={isLoading}
            />
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
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
