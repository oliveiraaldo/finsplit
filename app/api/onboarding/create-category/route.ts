import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateOnboardingToken, updateOnboardingToken } from '@/lib/onboarding-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color, groupId, onboardingToken } = body

    // Validar token
    const tokenData = validateOnboardingToken(onboardingToken)
    if (!tokenData || !tokenData.user_id) {
      return NextResponse.json(
        { message: 'Token inválido ou usuário não encontrado' },
        { status: 400 }
      )
    }

    if (!name || !color) {
      return NextResponse.json(
        { message: 'Nome e cor da categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: tokenData.user_id }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o grupo existe e pertence ao tenant do usuário
    let targetGroupId = groupId
    if (!targetGroupId) {
      // Buscar grupo padrão do usuário
      const defaultGroup = await prisma.group.findFirst({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: 'desc' }
      })
      targetGroupId = defaultGroup?.id
    }

    if (!targetGroupId) {
      return NextResponse.json(
        { message: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    // Criar categoria
    const category = await prisma.category.create({
      data: {
        name,
        color,
        tenantId: user.tenantId,
        groupId: targetGroupId
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'CATEGORY_CREATED_ONBOARDING',
        entity: 'CATEGORY',
        entityId: category.id,
        details: { name, color, onboarding: true },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    // Atualizar token para completed
    const updatedToken = updateOnboardingToken(onboardingToken, {
      step: 'completed'
    })

    return NextResponse.json({
      message: 'Categoria criada com sucesso',
      categoryId: category.id,
      updatedToken
    })

  } catch (error) {
    console.error('Erro ao criar categoria no onboarding:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
