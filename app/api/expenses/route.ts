import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('💰 Criando despesa manual:', body)

    // Validar dados obrigatórios
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { message: 'Descrição é obrigatória' },
        { status: 400 }
      )
    }

    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json(
        { message: 'Valor deve ser um número positivo' },
        { status: 400 }
      )
    }

    if (!body.date) {
      return NextResponse.json(
        { message: 'Data é obrigatória' },
        { status: 400 }
      )
    }

    if (!body.groupId) {
      return NextResponse.json(
        { message: 'Grupo é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar o usuário com tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Usuário ou tenant não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o grupo existe e o usuário tem acesso
    const group = await prisma.group.findFirst({
      where: {
        id: body.groupId,
        tenantId: user.tenant.id
      },
      include: {
        members: {
          where: {
            userId: user.id
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { message: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    if (group.members.length === 0) {
      return NextResponse.json(
        { message: 'Você não tem acesso a este grupo' },
        { status: 403 }
      )
    }

    const userMembership = group.members[0]

    // Verificar permissões - usuário deve poder criar despesas
    if (userMembership.permission === 'VIEW_ONLY') {
      return NextResponse.json(
        { message: 'Você não tem permissão para criar despesas neste grupo' },
        { status: 403 }
      )
    }

    // Buscar categoria se fornecida
    let categoryId = null
    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: body.categoryId,
          tenantId: user.tenant.id
        }
      })
      if (category) {
        categoryId = category.id
      }
    }

    // Criar a despesa
    const expense = await prisma.expense.create({
      data: {
        description: body.description.trim(),
        amount: body.amount,
        date: new Date(body.date),
        status: 'CONFIRMED',
        aiExtracted: false,
        aiConfidence: 0,
        receiptUrl: body.receiptUrl || null,
        mediaType: body.mediaType || null,
        paidBy: {
          connect: { id: user.id }
        },
        group: {
          connect: { id: body.groupId }
        },
        category: categoryId ? {
          connect: { id: categoryId }
        } : undefined
      },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_EXPENSE',
        entity: 'EXPENSE',
        entityId: expense.id,
        userId: user.id,
        tenantId: user.tenant.id,
        details: {
          description: expense.description,
          amount: expense.amount,
          groupId: body.groupId,
          manual: true
        }
      }
    })

    console.log('✅ Despesa criada:', expense.id)

    return NextResponse.json({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      status: expense.status,
      paidBy: expense.paidBy,
      group: expense.group,
      category: expense.category,
      aiExtracted: expense.aiExtracted
    })

  } catch (error) {
    console.error('❌ Erro ao criar despesa:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
