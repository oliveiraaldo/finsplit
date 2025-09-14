'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { toast } from 'sonner'
import { Mail, Lock } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (loginMode === 'password') {
        // Login com senha
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          toast.error('Email ou senha incorretos')
        } else {
          toast.success('Login realizado com sucesso!')
          router.push('/dashboard')
        }
      } else {
        // Magic link
        const result = await signIn('email', {
          email,
          redirect: false,
        })

        if (result?.error) {
          toast.error('Erro ao enviar magic link. Verifique se o email está cadastrado.')
        } else {
          setMagicLinkSent(true)
          toast.success('Magic link enviado! Verifique seu email.')
        }
      }
    } catch (error) {
      toast.error('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Verifique seu email</CardTitle>
              <CardDescription>
                Enviamos um link de acesso para <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    ✨ Clique no link que acabamos de enviar para fazer login automaticamente.
                  </p>
                </div>
                
                <p className="text-gray-600 text-sm">
                  O link expira em 24 horas. Não recebeu? Verifique sua pasta de spam.
                </p>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setMagicLinkSent(false)
                    setLoginMode('password')
                  }}
                  className="w-full"
                >
                  ← Voltar ao login
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar no FinSplit</CardTitle>
            <CardDescription>
              Acesse sua conta para gerenciar despesas em grupo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Toggle entre modos */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMode('password')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMode === 'password' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                Senha
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('magic')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  loginMode === 'magic' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                Magic Link
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              
              {loginMode === 'password' && (
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  loginMode === 'password' ? 'Entrando...' : 'Enviando...'
                ) : (
                  loginMode === 'password' ? 'Entrar com senha' : '✨ Enviar magic link'
                )}
              </Button>
            </form>

            {loginMode === 'magic' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Magic Link:</strong> Faça login sem senha! Enviamos um link seguro para seu email.
                </p>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Não tem uma conta?{' '}
                <Link href="/auth/signup" className="text-primary-600 hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
} 