'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { 
  ArrowLeft,
  Receipt,
  DollarSign,
  Calendar,
  Users,
  Tag
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Group {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function NewExpensePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0], // Data de hoje por padrão
    groupId: '',
    categoryId: ''
  })

  // Buscar grupos e categorias ao carregar
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar grupos
        const groupsResponse = await fetch('/api/dashboard/groups')
        if (groupsResponse.ok) {
          const groupsData = await groupsResponse.json()
          setGroups(groupsData)
          
          // Se só tem um grupo, selecionar automaticamente
          if (groupsData.length === 1) {
            setFormData(prev => ({ ...prev, groupId: groupsData[0].id }))
          }
        }

        // Buscar categorias
        const categoriesResponse = await fetch('/api/dashboard/categories')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData)
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validações
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }

    if (!formData.date) {
      toast.error('Data é obrigatória')
      return
    }

    if (!formData.groupId) {
      toast.error('Grupo é obrigatório')
      return
    }

    setIsLoading(true)
    try {
      const dataToSend = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        groupId: formData.groupId,
        categoryId: formData.categoryId || null
      }

      console.log('💰 Criando despesa:', dataToSend)

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      if (response.ok) {
        const expense = await response.json()
        console.log('✅ Despesa criada:', expense)
        toast.success('Despesa criada com sucesso!')
        router.push('/dashboard/expenses')
      } else {
        const errorData = await response.text()
        console.error('❌ Erro na resposta:', errorData)
        toast.error('Erro ao criar despesa')
      }
    } catch (error) {
      console.error('❌ Erro:', error)
      toast.error('Erro ao criar despesa')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Nova Despesa</h1>
            <p className="text-gray-600">Registre uma nova despesa manualmente</p>
          </div>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhes da Despesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Descrição *
                </Label>
                <Input
                  id="description"
                  placeholder="Ex: Jantar no restaurante, Gasolina, Supermercado..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor (R$) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Grupo */}
              <div className="space-y-2">
                <Label htmlFor="group" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Grupo *
                </Label>
                <Select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  disabled={isLoading}
                  required
                >
                  <option value="">Selecione um grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
                {groups.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum grupo encontrado. Crie um grupo primeiro.
                  </p>
                )}
              </div>

              {/* Categoria (opcional) */}
              <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Categoria (opcional)
                </Label>
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  disabled={isLoading}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Link href="/dashboard/expenses">
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading || groups.length === 0}>
                  {isLoading ? 'Criando...' : 'Criar Despesa'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
