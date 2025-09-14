import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateOnboardingToken, updateOnboardingToken } from '@/lib/onboarding-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type = 'PERSONAL', onboardingToken } = body

    // Validar token
    const tokenData = validateOnboardingToken(onboardingToken)
    if (!tokenData || !tokenData.user_id) {
      return NextResponse.json(
        { message: 'Token inválido ou usuário não encontrado' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { message: 'Nome do grupo é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário e tenant
    const user = await prisma.user.findUnique({
      where: { id: tokenData.user_id },
      include: { tenant: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Criar grupo
    const group = await prisma.group.create({
      data: {
        name,
        description: 'Grupo criado durante onboarding',
        tenantId: user.tenantId
      }
    })

    // Adicionar usuário como owner do grupo
    await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId: group.id,
        role: 'OWNER'
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'GROUP_CREATED_ONBOARDING',
        entity: 'GROUP',
        entityId: group.id,
        details: { name, type, onboarding: true },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    // Atualizar token
    const updatedToken = updateOnboardingToken(onboardingToken, {
      step: 'group_created'
    })

    return NextResponse.json({
      message: 'Grupo criado com sucesso',
      groupId: group.id,
      updatedToken
    })

  } catch (error) {
    console.error('Erro ao criar grupo no onboarding:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
