import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, tenantName, plan } = body

    // Validações básicas
    if (!name || !email || !password || !tenantName) {
      return NextResponse.json(
        { message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Verificar se o telefone já existe
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone }
      })

      if (existingPhone) {
        return NextResponse.json(
          { message: 'Este telefone já está em uso' },
          { status: 400 }
        )
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Configurar limites do plano
    const planConfig = plan === 'PREMIUM' ? {
      maxGroups: 999999,
      maxMembers: 999999,
      maxExports: 999999,
      hasWhatsApp: true,
      hasAI: true,
      credits: 100
    } : {
      maxGroups: 1,
      maxMembers: 5,
      maxExports: 10,
      hasWhatsApp: false,
      hasAI: false,
      credits: 0
    }

    // Criar tenant e usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          plan: plan || 'FREE',
          ...planConfig
        }
      })

      // Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'CLIENT',
          tenantId: tenant.id
        }
      })

      // Criar grupo padrão
      const defaultGroup = await tx.group.create({
        data: {
          name: 'Grupo Principal',
          description: 'Grupo padrão criado automaticamente',
          tenantId: tenant.id
        }
      })

      // Adicionar usuário como owner do grupo
      await tx.groupMember.create({
        data: {
          userId: user.id,
          groupId: defaultGroup.id,
          role: 'OWNER'
        }
      })

      // Criar categorias padrão
      const defaultCategories = [
        { name: 'Alimentação', color: '#FF6B6B', icon: '🍽️' },
        { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
        { name: 'Hospedagem', color: '#45B7D1', icon: '🏨' },
        { name: 'Entretenimento', color: '#96CEB4', icon: '🎮' },
        { name: 'Outros', color: '#FFEAA7', icon: '📦' }
      ]

      for (const category of defaultCategories) {
        await tx.category.create({
          data: {
            ...category,
            tenantId: tenant.id,
            groupId: defaultGroup.id
          }
        })
      }

      return { user, tenant, group: defaultGroup }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'USER_SIGNUP',
        entity: 'USER',
        entityId: result.user.id,
        details: { plan, tenantName },
        tenantId: result.tenant.id,
        userId: result.user.id
      }
    })

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      }
    })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 