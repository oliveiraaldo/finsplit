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

    // Buscar perfil do usuário com informações do tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            name: true,
            plan: true,
            credits: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar limites do tenant separadamente
    const tenantLimits = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        maxGroups: true,
        maxMembers: true
      }
    })

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      emailNotifications: user.emailNotifications,
      whatsappNotifications: user.whatsappNotifications,
      tenant: {
        ...user.tenant,
        groupLimit: tenantLimits?.maxGroups || 1,
        memberLimit: tenantLimits?.maxMembers || 5
      }
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Erro ao buscar perfil:', error)
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
    const { name, email, phone } = await request.json()

    // Validações básicas
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    if (name.length < 2) {
      return NextResponse.json(
        { message: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se o email já está em uso por outro usuário
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Validar formato do telefone se fornecido
    if (phone && phone.trim()) {
      const phoneRegex = /^\+55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json(
          { message: 'Formato de telefone inválido. Use: +55 (11) 99999-9999' },
          { status: 400 }
        )
      }
    }

    // Verificar se o telefone já está em uso por outro usuário (se fornecido)
    if (phone && phone.trim()) {
      const existingUserWithPhone = await prisma.user.findFirst({
        where: {
          phone: phone.trim(),
          id: { not: userId }
        }
      })

      if (existingUserWithPhone) {
        return NextResponse.json(
          { message: 'Este número de telefone já está em uso' },
          { status: 400 }
        )
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: phone?.trim() || null
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_UPDATED',
        entity: 'USER',
        entityId: userId,
        details: { updatedFields: ['name', 'email', 'phone'] },
        tenantId: session.user.tenantId,
        userId
      }
    })

    return NextResponse.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 