'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { 
  Settings, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus
} from 'lucide-react'

interface SystemSetting {
  id: string
  key: string
  value: any
  description: string | null
  isPublic: boolean
  updatedAt: string
  updatedBy: {
    name: string
    email: string
  } | null
}

interface SettingsResponse {
  settings: Record<string, SystemSetting[]>
  categories: string[]
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('general')

  useEffect(() => {
    fetchSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data: SettingsResponse = await response.json()
        setSettings(data.settings)
        setCategories(data.categories)
        if (data.categories.length > 0 && !data.categories.includes(activeCategory)) {
          setActiveCategory(data.categories[0])
        }
      } else {
        toast.error('Erro ao carregar configurações')
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      toast.error('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const initializeDefaultSettings = async () => {
    try {
      setSaving('initializing')
      const response = await fetch('/api/admin/settings', {
        method: 'PUT'
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchSettings()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao inicializar configurações')
      }
    } catch (error) {
      console.error('Erro ao inicializar configurações:', error)
      toast.error('Erro ao inicializar configurações')
    } finally {
      setSaving(null)
    }
  }

  const updateSetting = async (key: string, value: any, category: string, description?: string, isPublic?: boolean) => {
    try {
      setSaving(key)
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          category,
          description,
          isPublic
        })
      })

      if (response.ok) {
        toast.success('Configuração salva com sucesso!')
        fetchSettings()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar configuração')
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setSaving(null)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'general': return '⚙️'
      case 'integrations': return '🔌'
      case 'security': return '🛡️'
      case 'notifications': return '🔔'
      case 'limits': return '📊'
      default: return '⚙️'
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'general': return 'Geral'
      case 'integrations': return 'Integrações'
      case 'security': return 'Segurança'
      case 'notifications': return 'Notificações'
      case 'limits': return 'Limites'
      default: return category
    }
  }

  const renderSettingInput = (setting: SystemSetting) => {
    const handleChange = (newValue: any) => {
      updateSetting(
        setting.key,
        newValue,
        activeCategory,
        setting.description || undefined,
        setting.isPublic
      )
    }

    if (typeof setting.value === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={setting.value}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={saving === setting.key}
            className="rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">
            {setting.value ? 'Habilitado' : 'Desabilitado'}
          </span>
        </div>
      )
    }

    if (typeof setting.value === 'number') {
      return (
        <Input
          type="number"
          value={setting.value}
          onChange={(e) => handleChange(Number(e.target.value))}
          disabled={saving === setting.key}
          min="0"
        />
      )
    }

    return (
      <Input
        type="text"
        value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)}
        onChange={(e) => {
          let value: any = e.target.value
          try {
            value = JSON.parse(e.target.value)
          } catch {
            // Manter como string se não for JSON válido
          }
          handleChange(value)
        }}
        disabled={saving === setting.key}
      />
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-8 w-8 text-blue-600" />
              Configurações do Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Gerencie as configurações globais do sistema
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={initializeDefaultSettings}
              disabled={saving === 'initializing'}
              className="flex items-center gap-2"
            >
              {saving === 'initializing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                '➕'
              )}
              Inicializar Padrões
            </Button>
            <Button
              onClick={fetchSettings}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
              <p className="text-gray-600 mb-4">
                Clique em "Inicializar Padrões" para criar as configurações básicas do sistema.
              </p>
              <Button onClick={initializeDefaultSettings}>
                Inicializar Configurações
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar de Categorias */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Categorias</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          activeCategory === category 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-lg">{getCategoryIcon(category)}</span>
                        <span className="font-medium">{getCategoryName(category)}</span>
                        <span className="ml-auto text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                          {settings[category]?.length || 0}
                        </span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Configurações da Categoria Ativa */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">{getCategoryIcon(activeCategory)}</span>
                  {getCategoryName(activeCategory)}
                </CardTitle>
                </CardHeader>
                <CardContent>
                  {settings[activeCategory]?.length > 0 ? (
                    <div className="space-y-6">
                      {settings[activeCategory].map((setting) => (
                        <div key={setting.key} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Label className="font-medium text-gray-900 dark:text-white">
                                  {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                                {setting.isPublic && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                    Público
                                  </span>
                                )}
                              </div>
                              {setting.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {setting.description}
                                </p>
                              )}
                              {renderSettingInput(setting)}
                            </div>
                            <div className="ml-4">
                              {saving === setting.key ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </div>
                          {setting.updatedBy && (
                            <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                              Última atualização: {new Date(setting.updatedAt).toLocaleString('pt-BR')} por {setting.updatedBy.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        Nenhuma configuração disponível nesta categoria
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
