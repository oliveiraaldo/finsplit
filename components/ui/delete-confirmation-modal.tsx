'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  itemName: string
  itemType: 'tenant' | 'usuário'
  isLoading?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemType,
  isLoading = false
}: DeleteConfirmationModalProps) {
  const [confirmationText, setConfirmationText] = useState('')

  const handleClose = () => {
    setConfirmationText('')
    onClose()
  }

  const handleConfirm = () => {
    if (confirmationText === itemName) {
      onConfirm()
      setConfirmationText('')
    }
  }

  const isConfirmDisabled = confirmationText !== itemName || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              {title}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
              {description}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              ⚠️ Esta ação é <strong>irreversível</strong> e removerá todos os dados relacionados em cascade:
            </p>
            <ul className="mt-2 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
              <li>Todos os grupos e despesas</li>
              <li>Membros e pagamentos</li>
              <li>Arquivos e logs</li>
              <li>Configurações e histórico</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Para confirmar, digite exatamente o nome do {itemType}:
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Digite: <strong className="font-bold text-gray-900 dark:text-white">{itemName}</strong>
            </p>
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Digite "${itemName}" para confirmar`}
              disabled={isLoading}
              className="font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="flex-1"
            >
              {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
