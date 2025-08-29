'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  MessageSquare, 
  Image, 
  Send,
  Upload,
  Bot,
  Phone,
  CreditCard
} from 'lucide-react'

export default function TestIntegrationsPage() {
  const [whatsappData, setWhatsappData] = useState({
    phone: '',
    message: '',
    mediaUrl: ''
  })

  const [aiData, setAiData] = useState({
    description: '',
    imageFile: null as File | null,
    imagePreview: '',
    category: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [extractionResult, setExtractionResult] = useState<any>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('Arquivo selecionado:', file) // Debug
    if (file) {
      setAiData(prev => ({ ...prev, imageFile: file }))
      console.log('Estado atualizado:', { ...aiData, imageFile: file }) // Debug
      
      // Criar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAiData(prev => ({ ...prev, imagePreview: e.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleWhatsAppTest = async () => {
    if (!whatsappData.phone || !whatsappData.message) {
      toast.error('Telefone e mensagem são obrigatórios')
      return
    }

    // Limpar número de telefone (remover espaços, parênteses, hífens)
    const cleanPhone = whatsappData.phone.replace(/[\s\(\)\-]/g, '')
    
    if (!cleanPhone.startsWith('+')) {
      toast.error('Número deve começar com + (ex: +5511999999999)')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...whatsappData,
          phone: cleanPhone
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Mensagem WhatsApp enviada com sucesso!')
        console.log('Resultado:', result)
      } else {
        toast.error(result.message || 'Erro ao enviar mensagem')
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem WhatsApp')
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAITest = async () => {
    if (!aiData.imageFile) {
      toast.error('Selecione uma imagem para testar')
      return
    }

    setIsLoading(true)
    try {
      // Converter imagem para base64
      const base64 = await fileToBase64(aiData.imageFile)
      
      const response = await fetch('/api/ai/extract-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64.split(',')[1], // Remover data:image/...;base64,
          description: aiData.description,
          category: aiData.category
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Dados extraídos com sucesso!')
        setExtractionResult(result.data)
        console.log('Resultado da IA:', result)
      } else {
        toast.error(result.message || 'Erro na extração')
      }
    } catch (error) {
      toast.error('Erro na extração de dados')
      console.error('Erro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testar Integrações</h1>
          <p className="text-gray-600 mt-2">Teste as funcionalidades do Twilio WhatsApp e OpenAI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teste WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Teste WhatsApp (Twilio)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+55 (11) 99999-9999"
                  value={whatsappData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsappData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +55 (11) 99999-9999
                </p>
              </div>

              <div>
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem de teste..."
                  value={whatsappData.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWhatsappData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="mediaUrl">URL da Mídia (opcional)</Label>
                <Input
                  id="mediaUrl"
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={whatsappData.mediaUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsappData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleWhatsAppTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem WhatsApp
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Teste OpenAI */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Teste OpenAI (Extração de Recibos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Descrição adicional para ajudar a IA..."
                  value={aiData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria Personalizada (opcional)</Label>
                <Input
                  id="category"
                  placeholder="Ex: Serviços Cartorários, Alimentação, Transporte..."
                  value={aiData.category || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiData(prev => ({ ...prev, category: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco para usar a categoria detectada automaticamente
                </p>
              </div>

              <div>
                <Label htmlFor="image">Imagem do Recibo</Label>
                <div className="mt-1">
                                  <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
                </div>
                {aiData.imagePreview && (
                  <div className="mt-2">
                    <img 
                      src={aiData.imagePreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              {/* Debug info */}
              <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                <p>Estado atual: {JSON.stringify({ 
                  hasImage: !!aiData.imageFile, 
                  imageName: aiData.imageFile?.name,
                  isLoading 
                })}</p>
              </div>

              <Button 
                onClick={handleAITest} 
                disabled={isLoading || !aiData.imageFile}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processando...
                  </div>
                ) : (
                  <>
                    <Image className="mr-2 h-4 w-4" />
                    Extrair Dados com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado da IA */}
        {extractionResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Dados Extraídos pela IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(extractionResult, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Necessárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-500" />
                <span><strong>Twilio:</strong> TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER</span>
              </div>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-green-500" />
                <span><strong>OpenAI:</strong> OPENAI_API_KEY</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <span><strong>Plano:</strong> Premium para usar WhatsApp e IA</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 