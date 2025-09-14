'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

const colorPalette = [
  // Vermelhos
  '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#f87171', '#fca5a5',
  // Laranjas  
  '#f97316', '#ea580c', '#c2410c', '#9a3412', '#fb923c', '#fdba74',
  // Amarelos
  '#f59e0b', '#d97706', '#b45309', '#92400e', '#fbbf24', '#fcd34d',
  // Verdes Lima
  '#eab308', '#ca8a04', '#a16207', '#854d0e', '#facc15', '#fde047',
  // Verdes
  '#84cc16', '#65a30d', '#4d7c0f', '#365314', '#a3e635', '#bef264',
  // Esmeralda
  '#22c55e', '#16a34a', '#15803d', '#166534', '#4ade80', '#86efac',
  // Teal
  '#10b981', '#059669', '#047857', '#064e3b', '#34d399', '#6ee7b7',
  // Ciano
  '#14b8a6', '#0d9488', '#0f766e', '#134e4a', '#5eead4', '#99f6e4',
  // Azul Céu
  '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#67e8f9', '#a5f3fc',
  // Azul
  '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#38bdf8', '#7dd3fc',
  // Azul Índigo
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#60a5fa', '#93c5fd',
  // Violeta
  '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#818cf8', '#a5b4fc',
  // Roxo
  '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#a78bfa', '#c4b5fd',
  // Fúcsia
  '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#c084fc', '#d8b4fe',
  // Pink
  '#d946ef', '#c026d3', '#a21caf', '#86198f', '#e879f9', '#f0abfc',
  // Rosa
  '#ec4899', '#db2777', '#be185d', '#9d174d', '#f472b6', '#f9a8d4',
  // Vermelho Rosa
  '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#fb7185', '#fda4af',
  // Cinzas
  '#64748b', '#475569', '#334155', '#1e293b', '#94a3b8', '#cbd5e1',
  '#6b7280', '#4b5563', '#374151', '#1f2937', '#9ca3af', '#d1d5db',
  // Tons Escuros
  '#374151', '#1f2937', '#111827', '#0f172a', '#4b5563', '#6b7280',
  // Marrons
  '#92400e', '#a16207', '#b45309', '#c2410c', '#d97706', '#ea580c'
]

interface ColorPickerProps {
  selectedColor: string
  onColorSelect: (color: string) => void
  className?: string
}

export function ColorPicker({ selectedColor, onColorSelect, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 p-2 ${className}`}
      >
        <div className="flex items-center justify-between w-full">
          <div 
            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="text-sm font-medium text-gray-700 ml-2">
            {selectedColor.toUpperCase()}
          </span>
          <svg className="w-4 h-4 text-gray-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">Selecione uma cor:</h4>
              <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onColorSelect(color)
                      setIsOpen(false)
                    }}
                    className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                      selectedColor === color 
                        ? 'border-gray-900 ring-2 ring-blue-500' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-2">Ou digite uma cor personalizada:</h4>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  onColorSelect(e.target.value)
                  setIsOpen(false)
                }}
                className="w-full h-10 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

