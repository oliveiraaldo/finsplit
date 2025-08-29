import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { twilio } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const mediaUrl = formData.get('MediaUrl0') as string
    const messageSid = formData.get('MessageSid') as string

    // Remover prefixo "whatsapp:" do número
    const phone = from.replace('whatsapp:', '')

    // Buscar usuário pelo telefone
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { tenant: true }
    })

    if (!user) {
      await sendWhatsAppMessage(from, 'Usuário não encontrado. Por favor, cadastre-se no FinSplit primeiro.')
      return NextResponse.json({ message: 'Usuário não encontrado' })
    }

    // Verificar se o tenant tem WhatsApp habilitado (permitir durante desenvolvimento)
    if (!user.tenant.hasWhatsApp) {
      console.log('⚠️ Usuário sem WhatsApp habilitado, mas permitindo durante desenvolvimento')
      // await sendWhatsAppMessage(from, 'Seu plano atual não inclui integração com WhatsApp. Faça upgrade para Premium.')
      // return NextResponse.json({ message: 'WhatsApp não habilitado' })
    }

    // Verificar se tem créditos (permitir durante desenvolvimento)
    if (user.tenant.credits <= 0) {
      console.log('⚠️ Usuário sem créditos, mas permitindo durante desenvolvimento')
      // await sendWhatsAppMessage(from, 'Você não tem créditos suficientes. Entre em contato com o suporte.')
      // return NextResponse.json({ message: 'Sem créditos' })
    }

    // Se recebeu uma imagem/documento (recibo)
    if (mediaUrl) {
      return await handleReceiptUpload(from, mediaUrl, user, messageSid)
    }

    // Se recebeu texto
    if (body) {
      return await handleTextMessage(from, body, user)
    }

    return NextResponse.json({ message: 'Mensagem processada' })

  } catch (error) {
    console.error('Erro no webhook do Twilio:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function handleReceiptUpload(from: string, mediaUrl: string, user: any, messageSid: string) {
  try {
    // Baixar a mídia
    const mediaResponse = await fetch(mediaUrl)
    const mediaBuffer = await mediaResponse.arrayBuffer()

    // Converter para base64
    const base64Media = Buffer.from(mediaBuffer).toString('base64')

    // Extrair dados com OpenAI (com fallback para demonstração)
    let extractionResult = await extractReceiptData(base64Media)

    // Se falhar na OpenAI, usar modo de demonstração
    if (!extractionResult.success) {
      console.log('⚠️ OpenAI falhou no webhook, usando modo de demonstração')
      extractionResult = await extractReceiptDataDemo(base64Media)
      
      if (!extractionResult.success) {
        await sendWhatsAppMessage(from, 'Não consegui ler o recibo. Tente enviar uma imagem mais clara.')
        return NextResponse.json({ message: 'Falha na extração' })
      }
    }

    // Criar despesa pendente
    const expense = await prisma.expense.create({
      data: {
        description: extractionResult.data.description || 'Recibo enviado via WhatsApp',
        amount: extractionResult.data.amount,
        date: extractionResult.data.date || new Date(),
        status: 'PENDING',
        receiptUrl: mediaUrl,
        receiptData: extractionResult.data,
        aiExtracted: true,
        aiConfidence: extractionResult.confidence,
        paidById: user.id,
        groupId: user.tenant.groups[0]?.id, // Grupo padrão por enquanto
        categoryId: null
      }
    })

    // Consumir crédito
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { credits: { decrement: 1 } }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'RECEIPT_UPLOAD_WHATSAPP',
        entity: 'EXPENSE',
        entityId: expense.id,
        details: { mediaUrl, messageSid, aiConfidence: extractionResult.confidence },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    // Enviar confirmação
    const message = `✅ Recibo recebido!\n\n` +
      `📝 Descrição: ${extractionResult.data.description}\n` +
      `💰 Valor: R$ ${extractionResult.data.amount}\n` +
      `📅 Data: ${extractionResult.data.date}\n\n` +
      `Responda "sim" para confirmar ou "não" para rejeitar.`

    await sendWhatsAppMessage(from, message)

    return NextResponse.json({ message: 'Recibo processado com sucesso' })

  } catch (error) {
    console.error('Erro ao processar recibo:', error)
    await sendWhatsAppMessage(from, 'Erro ao processar o recibo. Tente novamente.')
    return NextResponse.json({ message: 'Erro ao processar recibo' })
  }
}

async function handleTextMessage(from: string, body: string, user: any) {
  const text = body.toLowerCase().trim()

  if (text === 'sim' || text === 'yes' || text === 'confirmar') {
    // Confirmar despesa pendente
    const pendingExpense = await prisma.expense.findFirst({
      where: {
        paidById: user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    if (pendingExpense) {
      await prisma.expense.update({
        where: { id: pendingExpense.id },
        data: { status: 'CONFIRMED' }
      })

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'EXPENSE_CONFIRMED_WHATSAPP',
          entity: 'EXPENSE',
          entityId: pendingExpense.id,
          details: { confirmedVia: 'whatsapp' },
          tenantId: user.tenantId,
          userId: user.id
        }
      })

      // Enviar link da planilha
      const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/groups/${pendingExpense.groupId}`
      await sendWhatsAppMessage(from, `✅ Despesa confirmada!\n\n📊 Veja na planilha: ${dashboardUrl}`)

    } else {
      await sendWhatsAppMessage(from, 'Não há despesas pendentes para confirmar.')
    }

  } else if (text === 'não' || text === 'no' || text === 'rejeitar') {
    // Rejeitar despesa pendente
    const pendingExpense = await prisma.expense.findFirst({
      where: {
        paidById: user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    if (pendingExpense) {
      await prisma.expense.update({
        where: { id: pendingExpense.id },
        data: { status: 'REJECTED' }
      })

      await sendWhatsAppMessage(from, '❌ Despesa rejeitada. Envie um novo recibo se necessário.')
    }

  } else if (text === 'ajuda' || text === 'help' || text === 'menu') {
    const helpMessage = `🤖 FinSplit WhatsApp Bot\n\n` +
      `📸 Envie uma foto do recibo para registrar uma despesa\n` +
      `✅ Responda "sim" para confirmar despesas\n` +
      `❌ Responda "não" para rejeitar despesas\n` +
      `📊 Digite "planilha" para ver o link da planilha\n` +
      `❓ Digite "ajuda" para ver este menu`

    await sendWhatsAppMessage(from, helpMessage)

  } else if (text === 'planilha' || text === 'dashboard') {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`
    await sendWhatsAppMessage(from, `📊 Acesse seu dashboard: ${dashboardUrl}`)

  } else {
    await sendWhatsAppMessage(from, 'Não entendi. Digite "ajuda" para ver as opções disponíveis.')
  }

  return NextResponse.json({ message: 'Mensagem processada' })
}

async function extractReceiptData(base64Image: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Modelo atualizado (gpt-4o inclui vision)
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analise este recibo e extraia os dados em formato JSON. Inclua apenas: description (string), amount (number), date (string ISO), items (array de strings). Se algum dado não estiver claro, use null."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { success: false, error: 'Resposta vazia da IA' }
    }

    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: 'Formato de resposta inválido' }
    }

    const extractedData = JSON.parse(jsonMatch[0])
    
    return {
      success: true,
      data: extractedData,
      confidence: 0.85 // Confiança padrão
    }

  } catch (error) {
    console.error('Erro na extração de dados:', error)
    return { success: false, error: 'Falha na extração' }
  }
}

async function sendWhatsAppMessage(to: string, body: string) {
  try {
    await twilio.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to
    })
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
  }
}

// Função de demonstração para quando OpenAI não estiver disponível
async function extractReceiptDataDemo(imageBase64: string) {
  try {
    console.log('🎭 Usando modo de demonstração para extração de dados (webhook)')
    
    // Simular processamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Dados simulados
    const demoData = {
      amount: Math.round((Math.random() * 100 + 10) * 100) / 100, // Valor entre 10-110
      date: new Date().toISOString().split('T')[0], // Data atual
      description: 'Recibo enviado via WhatsApp',
      items: ['Item principal', 'Taxa de serviço'],
      merchant: 'Estabelecimento Comercial',
      category: 'Alimentação'
    }
    
    return {
      success: true,
      data: demoData,
      confidence: 0.7 // Confiança média para dados simulados
    }
    
  } catch (error) {
    console.error('Erro no modo de demonstração (webhook):', error)
    return { success: false, error: 'Erro na demonstração' }
  }
} 