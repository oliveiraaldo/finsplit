'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Settings, 
  User,
  Shield,
  Bell,
  CreditCard,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  emailNotifications: boolean
  whatsappNotifications: boolean
  tenant: {
    name: string
    plan: string
    credits: number
    groupLimit: number
    memberLimit: number
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
          setFormData(prev => ({
            ...prev,
            name: data.name,
            email: data.email,
            phone: data.phone || ''
          }))
        } else {
          console.error('Erro ao buscar perfil:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        })
      })

      if (response.ok) {
        toast.success('Perfil atualizado com sucesso')
        setIsEditing(false)
        // Atualizar o perfil local
        if (profile) {
          setProfile({
            ...profile,
            name: formData.name,
            email: formData.email
          })
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      toast.error('Erro ao atualizar perfil')
    }
  }

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target
    
    if (id === 'whatsappNotifications' && checked && !formData.phone) {
      toast.error('Digite um número de telefone para ativar notificações WhatsApp')
      return
    }
    
    if (profile) {
      setProfile({
        ...profile,
        [id]: checked
      })
    }
  }

  const handleSaveNotifications = async () => {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailNotifications: profile?.emailNotifications || false,
          whatsappNotifications: profile?.whatsappNotifications || false,
          phone: formData.phone
        })
      })

      if (response.ok) {
        toast.success('Configurações de notificações salvas com sucesso')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao salvar configurações')
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações de notificações')
    }
  }

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      })

      if (response.ok) {
        toast.success('Senha alterada com sucesso')
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      } else {
        const error = await response.json()
        toast.error(error.message || 'Erro ao alterar senha')
      }
    } catch (error) {
      toast.error('Erro ao alterar senha')
    }
  }

  const getPlanInfo = (plan: string) => {
    const plans = {
      FREE: {
        name: 'Gratuito',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        features: ['1 grupo ativo', 'Até 5 membros', 'Exportação CSV']
      },
      PREMIUM: {
        name: 'Premium',
        color: 'text-primary-600',
        bgColor: 'bg-primary-100',
        features: ['Grupos ilimitados', 'Membros ilimitados', 'WhatsApp + IA', 'Exportação PDF/Excel', 'Gráficos avançados']
      }
    }
    return plans[plan as keyof typeof plans] || plans.FREE
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar perfil</h3>
          <p className="text-gray-600">Não foi possível carregar suas informações</p>
        </div>
      </DashboardLayout>
    )
  }

  const planInfo = getPlanInfo(profile.tenant.plan)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-2">Gerencie seu perfil e preferências</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Perfil do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Função</Label>
                <Input
                  value={profile.role === 'ADMIN' ? 'Administrador' : 'Cliente'}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Editar Perfil
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Empresa/Tenant</Label>
                <Input
                  value={profile.tenant.name}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div>
                <Label>Plano Atual</Label>
                <div className={`mt-1 px-3 py-2 rounded-lg ${planInfo.bgColor}`}>
                  <span className={`font-medium ${planInfo.color}`}>
                    {planInfo.name}
                  </span>
                </div>
              </div>

              <div>
                <Label>Créditos Disponíveis</Label>
                <Input
                  value={profile.tenant.credits}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Limite de Grupos</Label>
                  <Input
                    value={profile.tenant.groupLimit === -1 ? 'Ilimitado' : profile.tenant.groupLimit}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Limite de Membros</Label>
                  <Input
                    value={profile.tenant.memberLimit === -1 ? 'Ilimitado' : profile.tenant.memberLimit}
                    disabled
                    className="mt-1 bg-gray-50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Recursos do Plano:</h4>
                <ul className="space-y-1">
                  {planInfo.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="Digite sua senha atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirme a nova senha"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleChangePassword}>
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Notificações por Email */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações por Email</h4>
                    <p className="text-sm text-gray-600">Receber relatórios e atualizações por email</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={profile?.emailNotifications || false}
                      onChange={handleNotificationChange}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="emailNotifications" className="text-sm font-medium text-gray-700">
                      Ativar
                    </label>
                  </div>
                </div>
              </div>

              {/* Notificações WhatsApp */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notificações WhatsApp</h4>
                    <p className="text-sm text-gray-600">Receber confirmações de despesas via WhatsApp</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="whatsappNotifications"
                      checked={profile?.whatsappNotifications || false}
                      onChange={handleNotificationChange}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="whatsappNotifications" className="text-sm font-medium text-gray-700">
                      Ativar
                    </label>
                  </div>
                </div>
                
                {/* Campo de telefone */}
                <div>
                  <Label htmlFor="phone">Número de Telefone (WhatsApp)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+55 (11) 99999-9999"
                    className="mt-1"
                    disabled={!profile?.whatsappNotifications}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: +55 (11) 99999-9999
                  </p>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="pt-4 border-t border-gray-200">
                <Button onClick={handleSaveNotifications} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações de Notificações
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 