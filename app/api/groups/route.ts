import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Nome do grupo é obrigatório' },
        { status: 400 }
      )
    }

    const tenantId = session.user.tenantId
    const userId = session.user.id

    // Verificar limite de grupos do plano
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    const currentGroupsCount = await prisma.group.count({
      where: { tenantId }
    })

    if (currentGroupsCount >= tenant.maxGroups) {
      return NextResponse.json(
        { message: `Limite de grupos atingido. Seu plano permite ${tenant.maxGroups} grupo(s).` },
        { status: 400 }
      )
    }

    // Criar grupo e adicionar usuário como owner
    const result = await prisma.$transaction(async (tx) => {
      // Criar grupo
      const group = await tx.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          tenantId
        }
      })

      // Adicionar usuário como owner
      await tx.groupMember.create({
        data: {
          userId,
          groupId: group.id,
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
            tenantId,
            groupId: group.id
          }
        })
      }

      return group
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'GROUP_CREATED',
        entity: 'GROUP',
        entityId: result.id,
        details: { name, description },
        tenantId,
        userId
      }
    })

    return NextResponse.json({
      message: 'Grupo criado com sucesso',
      id: result.id,
      name: result.name
    })

  } catch (error) {
    console.error('Erro ao criar grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 