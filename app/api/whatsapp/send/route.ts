import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { twilioClient } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { to, phone, message, mediaUrl } = await request.json()

    // Debug: ver o que está sendo recebido
    console.log('📱 Dados recebidos na API WhatsApp:', { to, phone, message, mediaUrl })

    // Aceitar tanto 'to' quanto 'phone' para compatibilidade
    const phoneNumber = to || phone

    console.log('📞 Número de telefone extraído:', phoneNumber)

    // Validações
    if (!phoneNumber || !message) {
      console.log('❌ Validação falhou:', { phoneNumber: !!phoneNumber, message: !!message })
      return NextResponse.json(
        { message: 'Telefone e mensagem são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem WhatsApp habilitado
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem WhatsApp habilitado (permitir durante desenvolvimento)
    if (!user.tenant.hasWhatsApp) {
      console.log('⚠️ Usuário sem WhatsApp habilitado, mas permitindo durante desenvolvimento')
      // return NextResponse.json(
      //   { message: 'Seu plano não inclui WhatsApp' },
      //   { status: 403 }
      // )
    }

    // Verificar créditos (permitir durante desenvolvimento)
    if (user.tenant.credits <= 0) {
      console.log('⚠️ Usuário sem créditos, mas permitindo durante desenvolvimento')
      // return NextResponse.json(
      //   { message: 'Créditos insuficientes' },
      //   { status: 400 }
      // )
    }

    // Formatar número de telefone para WhatsApp
    const formattedPhone = phoneNumber.startsWith('+') ? `whatsapp:${phoneNumber}` : `whatsapp:+${phoneNumber}`

    console.log('📱 Número formatado para Twilio:', formattedPhone)

    // Enviar mensagem via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: formattedPhone,
      ...(mediaUrl && { mediaUrl: [mediaUrl] })
    })

    // Consumir crédito
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { credits: { decrement: 1 } }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'WHATSAPP_MESSAGE_SENT',
        entity: 'USER',
        entityId: user.id,
        details: { 
          to: phoneNumber, 
          message, 
          mediaUrl,
          twilioMessageId: twilioMessage.sid 
        },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    return NextResponse.json({
      message: 'Mensagem enviada com sucesso',
      twilioMessageId: twilioMessage.sid
    })

  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    return NextResponse.json(
      { message: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
} 