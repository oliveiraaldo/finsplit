'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

export function PhoneInput({ 
  value, 
  onChange, 
  label = "WhatsApp", 
  placeholder = "(11) 99999-9999",
  required = false,
  className = "",
  error = ""
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    // Quando o valor inicial muda, formatar para exibição
    if (value) {
      setDisplayValue(formatPhoneDisplay(value))
    } else {
      setDisplayValue('')
    }
  }, [value])

  const formatPhoneDisplay = (phone: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = phone.replace(/\D/g, '')
    
    // Se começa com 55, remove para exibir apenas o número brasileiro
    const brazilianNumber = numbers.startsWith('55') ? numbers.substring(2) : numbers
    
    // Aplica máscara (XX) XXXXX-XXXX
    if (brazilianNumber.length >= 11) {
      return `(${brazilianNumber.substring(0, 2)}) ${brazilianNumber.substring(2, 7)}-${brazilianNumber.substring(7, 11)}`
    } else if (brazilianNumber.length >= 7) {
      return `(${brazilianNumber.substring(0, 2)}) ${brazilianNumber.substring(2, 7)}-${brazilianNumber.substring(7)}`
    } else if (brazilianNumber.length >= 2) {
      return `(${brazilianNumber.substring(0, 2)}) ${brazilianNumber.substring(2)}`
    }
    return brazilianNumber
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    
    // Remove todos os caracteres não numéricos
    const numbers = input.replace(/\D/g, '')
    
    // Limita a 11 dígitos (XX + 9XXXXXXXX)
    const limitedNumbers = numbers.substring(0, 11)
    
    // Formatar para exibição
    const formatted = formatPhoneDisplay(limitedNumbers)
    setDisplayValue(formatted)
    
    // Enviar valor completo com +55 para o componente pai
    if (limitedNumbers.length >= 10) { // Mínimo: DDD + 8 ou 9 dígitos
      const fullPhone = `+55${limitedNumbers}`
      onChange(fullPhone)
    } else {
      onChange('')
    }
  }

  const validatePhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '')
    
    // Deve ter 11 dígitos (DDD + 9 dígitos) ou 10 dígitos (DDD + 8 dígitos para fixo)
    if (numbers.length < 10 || numbers.length > 11) {
      return false
    }
    
    // DDD deve estar entre 11 e 99
    const ddd = parseInt(numbers.substring(0, 2))
    if (ddd < 11 || ddd > 99) {
      return false
    }
    
    // Se for celular (11 dígitos), deve começar com 9
    if (numbers.length === 11 && numbers[2] !== '9') {
      return false
    }
    
    return true
  }

  const isValid = displayValue ? validatePhone(displayValue) : true

  return (
    <div className={className}>
      {label && (
        <Label htmlFor="phone" className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          <span className="text-xs text-gray-500">(+55 automático)</span>
        </Label>
      )}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-mono">
          +55
        </div>
        <Input
          id="phone"
          type="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`pl-12 ${!isValid && displayValue ? 'border-red-500' : ''}`}
        />
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      
      {!isValid && displayValue && (
        <p className="text-red-500 text-sm mt-1">
          Digite um número válido: DDD + número (ex: 11999998888)
        </p>
      )}
      
      {isValid && displayValue && (
        <p className="text-green-600 text-sm mt-1">
          ✓ WhatsApp: +55{displayValue.replace(/\D/g, '')}
        </p>
      )}
    </div>
  )
}
