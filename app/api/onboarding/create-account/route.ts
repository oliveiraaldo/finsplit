import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validateOnboardingToken, updateOnboardingToken } from '@/lib/onboarding-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, onboardingToken } = body

    // Validações básicas
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar token se fornecido
    let tokenData = null
    if (onboardingToken) {
      tokenData = validateOnboardingToken(onboardingToken)
      if (!tokenData) {
        return NextResponse.json(
          { message: 'Token de onboarding expirado ou inválido' },
          { status: 400 }
        )
      }
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Verificar telefone se fornecido
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

    // Criar tenant padrão
    const tenant = await prisma.tenant.create({
      data: {
        name: `${name} - Pessoal`,
        type: 'PERSONAL',
        plan: 'FREE',
        maxGroups: 1,
        maxMembers: 5,
        hasWhatsApp: false,
        credits: 0
      }
    })

    // Criar usuário (sem senha inicialmente - será usado magic link)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: await bcrypt.hash('temp-password', 12), // Senha temporária
        role: 'CLIENT',
        tenantId: tenant.id
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'USER_ONBOARDING_START',
        entity: 'USER',
        entityId: user.id,
        details: { step: 'account_created', hasPhone: !!phone },
        tenantId: tenant.id,
        userId: user.id
      }
    })

    // Atualizar token se existe
    let updatedToken = null
    if (tokenData) {
      updatedToken = updateOnboardingToken(onboardingToken, {
        user_id: user.id,
        step: 'account_created'
      })
    }

    return NextResponse.json({
      message: 'Conta criada com sucesso',
      userId: user.id,
      tenantId: tenant.id,
      updatedToken
    })

  } catch (error) {
    console.error('Erro ao criar conta no onboarding:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
