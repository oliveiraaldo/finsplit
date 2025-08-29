'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit, Trash2, Tag, Search } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryModal } from '@/components/dashboard/category-modal'

interface Category {
  id: string
  name: string
  color: string
  icon: string
  _count?: {
    expenses: number
  }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')

  // Buscar categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/dashboard/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        } else {
          console.error('Erro ao buscar categorias:', response.statusText)
          toast.error('Erro ao carregar categorias')
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error)
        toast.error('Erro ao carregar categorias')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Filtrar categorias baseado no termo de busca
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateCategory = () => {
    setSelectedCategory(null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setModalMode('edit')
    setIsModalOpen(true)
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/dashboard/categories/${category.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCategories(categories.filter(c => c.id !== category.id))
        toast.success('Categoria excluída com sucesso!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Erro ao excluir categoria')
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
      toast.error('Erro ao excluir categoria')
    }
  }

  const handleSaveCategory = (savedCategory: Category) => {
    if (modalMode === 'create') {
      setCategories([...categories, savedCategory])
    } else {
      setCategories(categories.map(c => 
        c.id === savedCategory.id ? savedCategory : c
      ))
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando categorias...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
              <p className="text-gray-600">Gerencie as categorias de despesas</p>
            </div>
          </div>
          <Button onClick={handleCreateCategory} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        </div>

        {/* Barra de busca */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredCategories.length} de {categories.length} categorias
          </div>
        </div>

        {/* Lista de categorias */}
        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                        {category._count && (
                          <p className="text-xs text-gray-500">
                            {category._count.expenses} despesas
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        title="Editar categoria"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
                        title="Excluir categoria"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Tente buscar com outros termos ou limpe o filtro'
                  : 'Crie sua primeira categoria para organizar suas despesas'
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateCategory} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Primeira Categoria
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Categoria */}
      <CategoryModal
        category={selectedCategory}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCategory}
        mode={modalMode}
      />
    </DashboardLayout>
  )
}