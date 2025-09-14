'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Mail } from 'lucide-react'

export default function VerifyRequestPage() {
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
              Um link de acesso foi enviado para seu email
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
              
              <div className="pt-4 space-y-2">
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    ← Voltar ao login
                  </Button>
                </Link>
                
                <p className="text-xs text-gray-500">
                  Problemas? Entre em contato conosco
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  )
}
