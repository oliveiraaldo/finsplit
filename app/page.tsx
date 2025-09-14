'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { 
  Users, 
  Receipt, 
  BarChart3, 
  Smartphone, 
  Brain, 
  CreditCard,
  Zap,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  TrendingUp,
  Globe,
  Clock,
  DollarSign
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  features: any
  maxGroups: number
  maxMembers: number
  hasWhatsApp: boolean
  creditsIncluded: number
  isActive: boolean
}

export default function HomePage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans/available')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Erro ao buscar planos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGetStarted = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 opacity-60"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium mb-8">
                🚀 Novo: Inteligência Artificial para Recibos
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Divida despesas com 
                <span className="text-primary-600"> inteligência</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                A forma mais simples de controlar gastos em grupo. 
                IA que lê recibos, WhatsApp integrado e divisão automática para família, amigos e empresa.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-primary-600 hover:bg-primary-700 text-lg px-8 py-4 rounded-xl shadow-lg">
                    Começar Gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-4 rounded-xl border-2"
                  onClick={handleGetStarted}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Ver Como Funciona
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="flex -space-x-2 mr-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-white"></div>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-white"></div>
                  </div>
                  Mais de 1.000 usuários satisfeitos
                </div>
                <div className="flex items-center text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-2 text-gray-600">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Video */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-1 shadow-2xl">
                <div className="bg-white rounded-xl p-8">
                  <div className="text-center mb-6">
                    <Image 
                      src="/logotipo.png" 
                      alt="FinSplit Dashboard" 
                      width={80} 
                      height={80}
                      className="mx-auto mb-4"
                    />
                    <h3 className="text-xl font-semibold text-gray-900">Dashboard FinSplit</h3>
                  </div>
                  
                  {/* Mockup Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-600">Viagem - Rio de Janeiro</span>
                      <span className="text-green-600 font-semibold">R$ 2.340,50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">Casa - Contas Mensais</span>
                      <span className="text-blue-600 font-semibold">R$ 1.856,30</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm text-gray-600">Empresa - Almoços</span>
                      <span className="text-purple-600 font-semibold">R$ 847,20</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-lg text-center">
                    <TrendingUp className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-primary-600">+47%</span> menos tempo organizando finanças
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Veja como é simples usar o FinSplit
            </h2>
            <p className="text-lg text-gray-600">
              Em menos de 2 minutos você entende como nossa IA e integração WhatsApp facilitam sua vida
            </p>
          </div>

          {/* Video Placeholder - Substituir pelo vídeo real */}
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900 aspect-video">
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-600 to-indigo-600">
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Demo do FinSplit</h3>
                <p className="text-white/80">Clique para ver como funciona</p>
              </div>
            </div>
            
            {/* Quando tiver o vídeo, substitua por: */}
            {/* <iframe 
              className="w-full h-full" 
              src="https://www.youtube.com/embed/SEU_VIDEO_ID" 
              title="FinSplit Demo"
              frameBorder="0"
              allowFullScreen
            ></iframe> */}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <Clock className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Rápido</h4>
              <p className="text-sm text-gray-600">Configure em 2 minutos</p>
            </div>
            <div className="text-center">
              <Brain className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Inteligente</h4>
              <p className="text-sm text-gray-600">IA lê seus recibos</p>
            </div>
            <div className="text-center">
              <Smartphone className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Automático</h4>
              <p className="text-sm text-gray-600">WhatsApp integrado</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Funcionalidades pensadas para simplificar o controle de gastos em grupo, 
              seja para família, amigos ou empresa
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <CardTitle className="text-lg">Grupos Inteligentes</CardTitle>
                <CardDescription>
                  Crie grupos para viagens, casa, trabalho ou qualquer ocasião. 
                  Cada grupo tem suas próprias despesas e relatórios.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">IA que Lê Recibos</CardTitle>
                <CardDescription>
                  Tire foto do recibo pelo WhatsApp e nossa IA extrai automaticamente 
                  valor, data, estabelecimento e categoriza o gasto.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">WhatsApp Integrado</CardTitle>
                <CardDescription>
                  Envie recibos, confirme gastos e receba relatórios direto pelo WhatsApp. 
                  Sem precisar abrir outro app.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Relatórios Detalhados</CardTitle>
                <CardDescription>
                  Gráficos interativos, relatórios por categoria e período. 
                  Veja onde está gastando e economize mais.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Receipt className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Divisão Automática</CardTitle>
                <CardDescription>
                  Calcule automaticamente quem deve quanto para quem. 
                  Divisão igual ou personalizada por pessoa.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-lg">Dados Seguros</CardTitle>
                <CardDescription>
                  Criptografia bancária, backup automático e conformidade LGPD. 
                  Seus dados estão seguros conosco.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-lg text-gray-600">
              Comece grátis e evolua conforme suas necessidades. Sem pegadinhas, sem taxa de setup.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative border-0 shadow-lg hover:shadow-xl transition-all ${
                    plan.price > 0 && plan.price < 50 ? 'border-2 border-primary-500 shadow-2xl scale-105' : ''
                  }`}
                >
                  {plan.price > 0 && plan.price < 50 && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                        ⭐ Mais Popular
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[3rem] flex items-center justify-center">
                      {plan.description || 'Plano ideal para suas necessidades'}
                    </CardDescription>
                    <div className="text-4xl font-bold text-gray-900 mt-4">
                      {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                      {plan.price > 0 && <span className="text-lg font-normal text-gray-600">/mês</span>}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{plan.maxGroups === -1 ? 'Grupos ilimitados' : `${plan.maxGroups} grupo${plan.maxGroups > 1 ? 's' : ''}`}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{plan.maxMembers === -1 ? 'Membros ilimitados' : `Até ${plan.maxMembers} membros`}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">{plan.creditsIncluded} créditos para IA</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">WhatsApp: {plan.hasWhatsApp ? '✅ Incluído' : '❌ Não incluído'}</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">Dashboard completo</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-sm">Relatórios e gráficos</span>
                      </li>
                    </ul>
                    
                    <Link href={`/auth/signup?planId=${plan.id}`} className="w-full">
                      <Button 
                        className={`w-full h-12 rounded-xl font-medium ${
                          plan.price > 0 && plan.price < 50 
                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800' 
                            : ''
                        }`}
                        variant={plan.price === 0 ? 'outline' : 'default'}
                      >
                        {plan.price === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Garantia */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-100 text-green-800">
              <Shield className="w-5 h-5 mr-2" />
              <span className="font-medium">Garantia de 30 dias - 100% do seu dinheiro de volta</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Pronto para simplificar suas finanças?
          </h2>
          <p className="text-xl text-primary-100 mb-8 leading-relaxed">
            Junte-se a milhares de pessoas que já organizaram suas despesas com o FinSplit. 
            Comece gratuitamente agora mesmo!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button 
                size="lg" 
                className="bg-white text-primary-600 hover:bg-gray-50 text-lg px-8 py-4 rounded-xl shadow-lg"
              >
                Criar Conta Gratuita
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg px-8 py-4 rounded-xl"
              onClick={handleGetStarted}
            >
              Falar com Vendas
            </Button>
          </div>

          <div className="mt-8 text-primary-100 text-sm">
            ✨ Sem cartão de crédito • ⚡ Ativação instantânea • 🔒 Dados 100% seguros
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}