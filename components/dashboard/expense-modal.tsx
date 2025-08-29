'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Receipt, 
  Calendar, 
  User, 
  Tag, 
  DollarSign,
  Eye,
  Edit,
  Save,
  X,
  Trash2
} from 'lucide-react'

interface ExpenseModalProps {
  expense: any | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (expense: any) => void
  onDelete: (id: string) => void
}

interface Category {
  id: string
  name: string
  color: string
  icon: string
}

export function ExpenseModal({ 
  expense, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}: ExpenseModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: '',
    status: '',
    categoryId: ''
  })

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : '',
        status: expense.status || 'PENDING',
        categoryId: expense.categoryId || ''
      })
    }
  }, [expense])

  useEffect(() => {
    // Buscar categorias disponíveis
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/dashboard/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Erro ao buscar categorias:', error)
      }
    }

    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!expense) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      })

      if (response.ok) {
        const updatedExpense = await response.json()
        onUpdate(updatedExpense)
        setIsEditing(false)
        toast.success('Despesa atualizada com sucesso!')
      } else {
        toast.error('Erro ao atualizar despesa')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return

    if (!confirm('Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete(expense.id)
        onClose()
        toast.success('Despesa excluída com sucesso!')
      } else {
        toast.error('Erro ao excluir despesa')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir despesa')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'text-green-600 bg-green-100'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-100'
      case 'REJECTED':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmada'
      case 'PENDING':
        return 'Pendente'
      case 'REJECTED':
        return 'Rejeitada'
      default:
        return status
    }
  }

  if (!expense) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {isEditing ? 'Editar Despesa' : 'Detalhes da Despesa'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              {isEditing ? (
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da despesa"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md">
                  {expense.description}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Valor</Label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md font-semibold text-lg">
                  {formatCurrency(expense.amount)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(expense.date)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="PENDING">Pendente</option>
                  <option value="CONFIRMED">Confirmada</option>
                  <option value="REJECTED">Rejeitada</option>
                </Select>
              ) : (
                <div className={`p-3 rounded-md text-center font-medium ${getStatusColor(expense.status)}`}>
                  {getStatusText(expense.status)}
                </div>
              )}
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pagador</Label>
                <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {expense.paidBy?.name || 'N/A'}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Grupo</Label>
                <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {expense.group?.name || 'N/A'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              {isEditing ? (
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-md flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {expense.category?.name || 'Sem categoria'}
                </div>
              )}
            </div>
          </div>

          {/* Dados da IA */}
          {expense.aiExtracted && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Dados Extraídos pela IA
              </Label>
              <div className="p-3 bg-blue-50 rounded-md text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Confiança:</span> {expense.aiConfidence || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span> {expense.documentType || 'Recibo'}
                  </div>
                </div>
                {expense.receiptData && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Ver dados completos</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                      {JSON.stringify(expense.receiptData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Recibo */}
          {expense.receiptUrl && (
            <div className="space-y-2">
              <Label>Recibo</Label>
              <div className="p-3 bg-gray-50 rounded-md">
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Visualizar recibo
                </a>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button onClick={onClose}>
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 