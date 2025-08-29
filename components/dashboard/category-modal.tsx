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
import { Save, Palette } from 'lucide-react'
import { toast } from 'sonner'

interface CategoryModalProps {
  category: any | null
  isOpen: boolean
  onClose: () => void
  onSave: (category: any) => void
  mode: 'create' | 'edit'
}

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
]

const icons = [
  '🍽️', '🛒', '🚗', '⛽', '🎬', '🛍️', '💊', '📚', '🏠', '💡',
  '💧', '🌐', '🏘️', '✈️', '🏨', '🎡', '💼', '📝', '🐕', '🐾',
  '💳', '🎯', '🎨', '🎵', '📱', '💻', '🍕', '☕', '🍺', '🎂'
]

export function CategoryModal({ category, isOpen, onClose, onSave, mode }: CategoryModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: colors[0],
    icon: icons[0]
  })

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name || '',
        color: category.color || colors[0],
        icon: category.icon || icons[0]
      })
    } else {
      setFormData({
        name: '',
        color: colors[0],
        icon: icons[0]
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da categoria"
              disabled={isLoading}
              required
            />
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-10 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-2 text-lg rounded border hover:bg-gray-50 ${
                    formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cor
            </Label>
            <div className="grid grid-cols-10 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <span className="text-lg">{formData.icon}</span>
              <span 
                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: formData.color }}
              >
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
