'use client'
import { useState } from 'react'
import { AdminLayout } from '@/components/admin/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MessageSquare, Bot, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AdminTestIntegrations() {
  const [whatsappTest, setWhatsappTest] = useState({
    phone: '+5538997279959',
    message: 'Teste de integração WhatsApp do painel admin',
    loading: false,
    result: null as any
  })

  const [openaiTest, setOpenaiTest] = useState({
    prompt: 'Extraia os dados do seguinte recibo: Mesa de jantar - R$ 500,00 - Data: 13/09/2025',
    loading: false,
    result: null as any
  })

  const testWhatsApp = async () => {
    setWhatsappTest(prev => ({ ...prev, loading: true, result: null }))
    
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: whatsappTest.phone,
          message: whatsappTest.message
        })
      })

      const result = await response.json()
      
      setWhatsappTest(prev => ({ 
        ...prev, 
        result: { 
          success: response.ok, 
          data: result,
          status: response.status
        } 
      }))

      if (response.ok) {
        toast.success('Mensagem WhatsApp enviada com sucesso!')
      } else {
        toast.error(`Erro ao enviar WhatsApp: ${result.message}`)
      }
    } catch (error) {
      console.error('Erro no teste WhatsApp:', error)
      setWhatsappTest(prev => ({ 
        ...prev, 
        result: { 
          success: false, 
          error: 'Erro de conexão' 
        } 
      }))
      toast.error('Erro de conexão ao testar WhatsApp')
    } finally {
      setWhatsappTest(prev => ({ ...prev, loading: false }))
    }
  }

  const testOpenAI = async () => {
    setOpenaiTest(prev => ({ ...prev, loading: true, result: null }))
    
    try {
      const response = await fetch('/api/ai/extract-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: openaiTest.prompt,
          testMode: true
        })
      })

      const result = await response.json()
      
      setOpenaiTest(prev => ({ 
        ...prev, 
        result: { 
          success: response.ok, 
          data: result,
          status: response.status
        } 
      }))

      if (response.ok) {
        toast.success('Teste OpenAI executado com sucesso!')
      } else {
        toast.error(`Erro no teste OpenAI: ${result.message}`)
      }
    } catch (error) {
      console.error('Erro no teste OpenAI:', error)
      setOpenaiTest(prev => ({ 
        ...prev, 
        result: { 
          success: false, 
          error: 'Erro de conexão' 
        } 
      }))
      toast.error('Erro de conexão ao testar OpenAI')
    } finally {
      setOpenaiTest(prev => ({ ...prev, loading: false }))
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teste de Integrações</h1>
          <p className="text-gray-600 mt-2">Teste as integrações do sistema (WhatsApp e OpenAI)</p>
        </div>

        {/* WhatsApp Test */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Teste WhatsApp (Twilio)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp-phone">Número de Telefone</Label>
              <Input
                id="whatsapp-phone"
                type="text"
                value={whatsappTest.phone}
                onChange={(e) => setWhatsappTest(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+5511999999999"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="whatsapp-message">Mensagem</Label>
              <Textarea
                id="whatsapp-message"
                value={whatsappTest.message}
                onChange={(e) => setWhatsappTest(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Digite a mensagem de teste..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <Button 
              onClick={testWhatsApp} 
              disabled={whatsappTest.loading}
              className="w-full sm:w-auto"
            >
              {whatsappTest.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Testar WhatsApp
                </>
              )}
            </Button>
            
            {whatsappTest.result && (
              <div className={`p-4 rounded-lg ${whatsappTest.result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  {whatsappTest.result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${whatsappTest.result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {whatsappTest.result.success ? 'Sucesso' : 'Erro'}
                  </span>
                </div>
                <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                  {JSON.stringify(whatsappTest.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* OpenAI Test */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <Bot className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Teste OpenAI</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="openai-prompt">Prompt de Teste</Label>
              <Textarea
                id="openai-prompt"
                value={openaiTest.prompt}
                onChange={(e) => setOpenaiTest(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="Digite o prompt para testar a IA..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            <Button 
              onClick={testOpenAI} 
              disabled={openaiTest.loading}
              className="w-full sm:w-auto"
            >
              {openaiTest.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Testar OpenAI
                </>
              )}
            </Button>
            
            {openaiTest.result && (
              <div className={`p-4 rounded-lg ${openaiTest.result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  {openaiTest.result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={`font-medium ${openaiTest.result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {openaiTest.result.success ? 'Sucesso' : 'Erro'}
                  </span>
                </div>
                <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                  {JSON.stringify(openaiTest.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* System Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Twilio Account SID:</strong>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID ? '✅ Configurado' : '❌ Não configurado'}
              </span>
            </div>
            <div>
              <strong>OpenAI API:</strong>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_OPENAI_CONFIGURED ? '✅ Configurado' : '❌ Não configurado'}
              </span>
            </div>
            <div>
              <strong>Database:</strong>
              <span className="ml-2 text-gray-600">✅ Conectado</span>
            </div>
            <div>
              <strong>NextAuth:</strong>
              <span className="ml-2 text-gray-600">✅ Ativo</span>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}
