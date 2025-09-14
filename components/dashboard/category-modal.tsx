'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { ColorPicker } from '@/components/ui/color-picker'
import { toast } from 'sonner'

interface CategoryModalProps {
  category: any | null
  isOpen: boolean
  onClose: () => void
  onSave: (category: any) => void
  mode: 'create' | 'edit'
}

const defaultColor = '#3b82f6'

export function CategoryModal({ category, isOpen, onClose, onSave, mode }: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: defaultColor
  })

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name || '',
        color: category.color || defaultColor
      })
    } else {
      setFormData({
        name: '',
        color: defaultColor
      })
    }
  }, [category, mode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório')
      return
    }

    setIsLoading(true)
    try {
      const url = mode === 'edit' ? `/api/dashboard/categories/${category.id}` : '/api/dashboard/categories'
      const method = mode === 'edit' ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const savedCategory = await response.json()
        onSave(savedCategory)
        toast.success(mode === 'edit' ? 'Categoria atualizada!' : 'Categoria criada!')
        onClose()
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Erro ao salvar categoria')
      }
    } catch (error) {
      console.error('Erro ao salvar categoria:', error)
      toast.error('Erro ao salvar categoria')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Alimentação, Transporte, Entretenimento..."
              disabled={isLoading}
              required
            />
          </div>

          {/* Cor */}
          <div className="space-y-3">
            <Label>Cor da Categoria</Label>
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0 shadow-sm"
                style={{ backgroundColor: formData.color }}
              />
              <div className="flex-1">
                <ColorPicker
                  selectedColor={formData.color}
                  onColorSelect={(color) => setFormData({ ...formData, color })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Pré-visualização</Label>
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-gray-50">
              <div 
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: formData.color }}
              />
              <span className="font-medium text-gray-900">
                {formData.name || 'Nome da categoria'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'edit' ? 'Atualizar' : 'Criar'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
