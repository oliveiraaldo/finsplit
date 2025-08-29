import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Receipt, 
  BarChart3, 
  Smartphone, 
  Brain, 
  CreditCard,
  Zap,
  Shield
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">FinSplit</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/auth/signin" className="text-gray-600 hover:text-primary-600">
                Entrar
              </Link>
              <Link href="/auth/signup">
                <Button>Criar Conta</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Controle de Despesas em Grupo
            <span className="text-primary-600"> Simplificado</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Divida despesas, controle gastos e mantenha todos informados com integração WhatsApp e inteligência artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-3">
                Começar Gratuitamente
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Ver Funcionalidades
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Principais
            </h2>
            <p className="text-lg text-gray-600">
              Tudo que você precisa para gerenciar despesas em grupo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Grupos de Despesas</CardTitle>
                <CardDescription>
                  Crie grupos para viagens, casa, trabalho ou qualquer ocasião
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Receipt className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Controle Automático</CardTitle>
                <CardDescription>
                  Saldos calculados automaticamente para cada membro
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Smartphone className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Integração WhatsApp</CardTitle>
                <CardDescription>
                  Envie recibos pelo WhatsApp e confirme despesas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Inteligência Artificial</CardTitle>
                <CardDescription>
                  IA extrai dados dos recibos automaticamente
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Relatórios e Gráficos</CardTitle>
                <CardDescription>
                  Visualize gastos e tendências com gráficos interativos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CreditCard className="h-12 w-12 text-primary-600 mb-4" />
                <CardTitle>Planos Flexíveis</CardTitle>
                <CardDescription>
                  Comece grátis e evolua conforme suas necessidades
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Planos e Preços
            </h2>
            <p className="text-lg text-gray-600">
              Escolha o plano ideal para suas necessidades
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Perfeito para começar</CardDescription>
                <div className="text-4xl font-bold text-gray-900 mt-4">
                  R$ 0
                  <span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    1 grupo ativo
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Até 5 membros
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Exportação CSV
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Dashboard básico
                  </li>
                </ul>
                <Link href="/auth/signup" className="w-full">
                  <Button variant="outline" className="w-full">
                    Começar Grátis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-primary-500 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription>Para uso profissional</CardDescription>
                <div className="text-4xl font-bold text-gray-900 mt-4">
                  R$ 29,90
                  <span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Grupos ilimitados
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Membros ilimitados
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    WhatsApp + IA
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Exportação PDF/Excel
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Gráficos avançados
                  </li>
                  <li className="flex items-center">
                    <Zap className="h-5 w-5 text-success-500 mr-3" />
                    Múltiplas planilhas
                  </li>
                </ul>
                <Link href="/auth/signup?plan=premium" className="w-full">
                  <Button className="w-full">
                    Começar Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary-400 mb-4">FinSplit</h3>
              <p className="text-gray-400">
                Controle de despesas em grupo simplificado e inteligente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features">Funcionalidades</Link></li>
                <li><Link href="#pricing">Preços</Link></li>
                <li><Link href="/docs">Documentação</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about">Sobre</Link></li>
                <li><Link href="/contact">Contato</Link></li>
                <li><Link href="/privacy">Privacidade</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help">Central de Ajuda</Link></li>
                <li><Link href="/status">Status do Sistema</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FinSplit. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 