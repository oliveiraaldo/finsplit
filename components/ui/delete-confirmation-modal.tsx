'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

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
      <DialogContent className="max-w-lg bg-white rounded-2xl shadow-2xl border-0 p-0">
        {/* Header */}
        <div className="relative p-6 pb-0">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
          <DialogTitle className="text-2xl font-semibold text-gray-900 pr-12">
            {title}
          </DialogTitle>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Warning Message */}
          <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <span className="text-2xl">😞</span>
              </div>
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">
                  Confirmando a exclusão de <span className="font-bold text-red-900">{itemName}</span>, todas as configurações e mensagens dela serão apagadas <strong>permanentemente</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900">
              Confirme o {itemType} que deseja excluir
            </h3>
            <div className="relative">
              <Input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={itemName}
                disabled={isLoading}
                className="w-full h-14 px-4 text-lg border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-0"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                @{itemType === 'usuário' ? 'usuário' : 'tenant'}.com.br
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="w-full h-14 text-lg font-medium bg-red-400 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Excluindo...
              </div>
            ) : (
              `Quero apagar ${itemType === 'usuário' ? 'o usuário' : 'o tenant'} e seus dados`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
