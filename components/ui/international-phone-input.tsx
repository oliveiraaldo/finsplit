'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'

interface CountryCode {
  code: string
  name: string
  flag: string
  phoneCode: string
  placeholder: string
  maxLength: number
}

const countries: CountryCode[] = [
  {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    phoneCode: '+55',
    placeholder: '(11) 99999-9999',
    maxLength: 11
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    phoneCode: '+1',
    placeholder: '(555) 123-4567',
    maxLength: 10
  },
  {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    phoneCode: '+52',
    placeholder: '55 1234 5678',
    maxLength: 10
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    phoneCode: '+54',
    placeholder: '11 1234-5678',
    maxLength: 10
  },
  {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    phoneCode: '+56',
    placeholder: '9 1234 5678',
    maxLength: 9
  },
  {
    code: 'CO',
    name: 'Colômbia',
    flag: '🇨🇴',
    phoneCode: '+57',
    placeholder: '300 123 4567',
    maxLength: 10
  },
  {
    code: 'PE',
    name: 'Peru',
    flag: '🇵🇪',
    phoneCode: '+51',
    placeholder: '987 654 321',
    maxLength: 9
  },
  {
    code: 'UY',
    name: 'Uruguai',
    flag: '🇺🇾',
    phoneCode: '+598',
    placeholder: '91 234 567',
    maxLength: 8
  },
  {
    code: 'PY',
    name: 'Paraguai',
    flag: '🇵🇾',
    phoneCode: '+595',
    placeholder: '981 123456',
    maxLength: 9
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    phoneCode: '+351',
    placeholder: '912 345 678',
    maxLength: 9
  },
  {
    code: 'ES',
    name: 'Espanha',
    flag: '🇪🇸',
    phoneCode: '+34',
    placeholder: '612 34 56 78',
    maxLength: 9
  }
]

interface InternationalPhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  className?: string
  error?: string
}

export function InternationalPhoneInput({ 
  value, 
  onChange, 
  label = "WhatsApp", 
  required = false,
  className = "",
  error = ""
}: InternationalPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countries[0]) // Brasil por padrão
  const [phoneNumber, setPhoneNumber] = useState('')

  useEffect(() => {
    // Quando o valor inicial muda, tentar extrair país e número
    if (value) {
      const country = countries.find(c => value.startsWith(c.phoneCode))
      if (country) {
        setSelectedCountry(country)
        setPhoneNumber(formatPhoneForDisplay(value.replace(country.phoneCode, ''), country))
      }
    }
  }, [value])

  const formatPhoneForDisplay = (phone: string, country: CountryCode) => {
    const numbers = phone.replace(/\D/g, '')
    
    switch (country.code) {
      case 'BR':
        // (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (numbers.length >= 11) {
          return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7, 11)}`
        } else if (numbers.length >= 7) {
          return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`
        } else if (numbers.length >= 2) {
          return `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`
        }
        return numbers
      
      case 'US':
        // (XXX) XXX-XXXX
        if (numbers.length >= 10) {
          return `(${numbers.substring(0, 3)}) ${numbers.substring(3, 6)}-${numbers.substring(6, 10)}`
        } else if (numbers.length >= 6) {
          return `(${numbers.substring(0, 3)}) ${numbers.substring(3, 6)}-${numbers.substring(6)}`
        } else if (numbers.length >= 3) {
          return `(${numbers.substring(0, 3)}) ${numbers.substring(3)}`
        }
        return numbers
      
      case 'AR':
      case 'MX':
        // XX XXXX-XXXX
        if (numbers.length >= 8) {
          return `${numbers.substring(0, 2)} ${numbers.substring(2, 6)}-${numbers.substring(6)}`
        } else if (numbers.length >= 2) {
          return `${numbers.substring(0, 2)} ${numbers.substring(2)}`
        }
        return numbers
      
      default:
        // Formato simples com espaços a cada 3 dígitos
        return numbers.replace(/(\d{3})(?=\d)/g, '$1 ')
    }
  }

  const validatePhone = (phone: string, country: CountryCode) => {
    const numbers = phone.replace(/\D/g, '')
    
    switch (country.code) {
      case 'BR':
        // 10 ou 11 dígitos, DDD entre 11-99, celular começa com 9
        if (numbers.length < 10 || numbers.length > 11) return false
        const ddd = parseInt(numbers.substring(0, 2))
        if (ddd < 11 || ddd > 99) return false
        if (numbers.length === 11 && numbers[2] !== '9') return false
        return true
      
      case 'US':
        // 10 dígitos, primeiro não pode ser 0 ou 1
        return numbers.length === 10 && numbers[0] !== '0' && numbers[0] !== '1'
      
      default:
        // Validação básica por comprimento
        return numbers.length >= country.maxLength - 2 && numbers.length <= country.maxLength + 1
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = countries.find(c => c.code === e.target.value) || countries[0]
    setSelectedCountry(country)
    setPhoneNumber('')
    onChange('')
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const numbers = input.replace(/\D/g, '')
    
    // Limitar pelo tamanho máximo do país
    const limitedNumbers = numbers.substring(0, selectedCountry.maxLength)
    
    // Formatar para exibição
    const formatted = formatPhoneForDisplay(limitedNumbers, selectedCountry)
    setPhoneNumber(formatted)
    
    // Enviar valor completo com código do país
    if (limitedNumbers.length >= selectedCountry.maxLength - 2) {
      const fullPhone = `${selectedCountry.phoneCode}${limitedNumbers}`
      onChange(fullPhone)
    } else {
      onChange('')
    }
  }

  const isValid = phoneNumber ? validatePhone(phoneNumber, selectedCountry) : true

  return (
    <div className={className}>
      {label && (
        <Label className="flex items-center gap-2 mb-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="flex gap-2">
        {/* Select de País */}
        <div className="w-40">
          <Select value={selectedCountry.code} onChange={handleCountryChange}>
            <option value="">País</option>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.flag} {country.phoneCode}
              </SelectItem>
            ))}
          </Select>
        </div>
        
        {/* Input de Telefone */}
        <div className="flex-1">
          <Input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder={selectedCountry.placeholder}
            className={!isValid && phoneNumber ? 'border-red-500' : ''}
          />
        </div>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      
      {!isValid && phoneNumber && (
        <p className="text-red-500 text-sm mt-1">
          Formato inválido para {selectedCountry.name}
        </p>
      )}
      
      {isValid && phoneNumber && (
        <p className="text-green-600 text-sm mt-1">
          ✓ WhatsApp: {selectedCountry.phoneCode} {phoneNumber.replace(/\D/g, '')}
        </p>
      )}
      
      <p className="text-gray-500 text-xs mt-1">
        {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.phoneCode})
      </p>
    </div>
  )
}
