'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Plus,
  Edit,
  Trash2,
  Tag,
  Palette,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: '📋'
  })

  // Cores predefinidas para facilitar a seleção
  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ]

  // Ícones predefinidos
  const predefinedIcons = [
    '🍽️', '🛒', '🚗', '⛽', '🎬', '🛍️', '👕', '💊', 
    '📚', '🏠', '💡', '✈️', '💼', '🐕', '📋'
  ]

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/dashboard/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        toast.error('Erro ao buscar categorias')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao buscar categorias')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        color: category.color,
        icon: category.icon
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        color: '#3B82F6',
        icon: '📋'
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', color: '#3B82F6', icon: '📋' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setIsSubmitting(true)
    try {
      const url = editingCategory 
        ? `/api/dashboard/categories/${editingCategory.id}`
        : '/api/dashboard/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const savedCategory = await response.json()
        
        if (editingCategory) {
          setCategories(prev => 
            prev.map(cat => cat.id === editingCategory.id ? savedCategory : cat)
          )
          toast.success('Categoria atualizada com sucesso!')
        } else {
          setCategories(prev => [...prev, savedCategory])
          toast.success('Categoria criada com sucesso!')
        }
        
        handleCloseModal()
      } else {
        const errorData = await response.text()
        console.error('Erro na resposta:', errorData)
        toast.error('Erro ao salvar categoria')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao salvar categoria')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/categories/${category.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== category.id))
        toast.success('Categoria excluída com sucesso!')
      } else {
        const errorData = await response.text()
        console.error('Erro na resposta:', errorData)
        toast.error('Erro ao excluir categoria')
      }
    } catch (error) {
      console.error('Erro:', error)
      toast.error('Erro ao excluir categoria')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Categorias</h1>
              <p className="text-gray-600">Gerencie suas categorias de despesas</p>
            </div>
          </div>
          <div className="text-center py-8">
            Carregando categorias...
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
            <h1 className="text-2xl font-bold">Categorias</h1>
            <p className="text-gray-600">Gerencie suas categorias de despesas</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </div>

        {/* Lista de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-gray-500">{category.color}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenModal(category)}
                      title="Editar categoria"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(category)}
                      title="Excluir categoria"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Nenhuma categoria encontrada</h3>
              <p className="text-gray-600 mb-4">Crie sua primeira categoria para organizar suas despesas</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Categoria
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Alimentação, Transporte..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor *</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-10 h-10 rounded-lg border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isSubmitting}
                  className="h-10"
                />
              </div>
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label>Ícone *</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {predefinedIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg ${
                        formData.icon === icon ? 'border-gray-900 bg-gray-100' : 'border-gray-200'
                      }`}
                      onClick={() => setFormData({ ...formData, icon })}
                      disabled={isSubmitting}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Ou digite um emoji"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  disabled={isSubmitting}
                  maxLength={2}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.icon}
                </div>
                <div>
                  <div className="font-medium">{formData.name || 'Nome da categoria'}</div>
                  <div className="text-sm text-gray-500">{formData.color}</div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
