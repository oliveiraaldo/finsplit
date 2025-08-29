import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Buscar configurações de notificações do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        emailNotifications: true,
        whatsappNotifications: true,
        phone: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      emailNotifications: user.emailNotifications || false,
      whatsappNotifications: user.whatsappNotifications || false,
      phone: user.phone
    })

  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { emailNotifications, whatsappNotifications, phone } = await request.json()

    // Validações
    if (whatsappNotifications && !phone) {
      return NextResponse.json(
        { message: 'Telefone é obrigatório para notificações WhatsApp' },
        { status: 400 }
      )
    }

    // Atualizar configurações
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailNotifications: emailNotifications || false,
        whatsappNotifications: whatsappNotifications || false,
        phone: phone || null
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'NOTIFICATIONS_UPDATED',
        entity: 'USER',
        entityId: userId,
        details: { 
          emailNotifications, 
          whatsappNotifications, 
          phone 
        },
        tenantId: session.user.tenantId,
        userId
      }
    })

    return NextResponse.json({
      message: 'Configurações de notificações atualizadas com sucesso',
      notifications: {
        emailNotifications: updatedUser.emailNotifications,
        whatsappNotifications: updatedUser.whatsappNotifications,
        phone: updatedUser.phone
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar notificações:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 