import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const tenantId = session.user.tenantId
    const userId = session.user.id

    // Verificar se o usuário é membro do grupo
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    })

    if (!groupMembership) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar detalhes do grupo
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
        tenantId
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        expenses: {
          where: {
            status: 'CONFIRMED'
          },
          include: {
            paidBy: {
              select: {
                name: true
              }
            },
            category: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
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

    // Calcular totais e saldos
    const totalExpenses = group.expenses.reduce((sum, expense) => {
      return sum + Number(expense.amount)
    }, 0)

    const averagePerPerson = group.members.length > 0 ? totalExpenses / group.members.length : 0

    // Calcular saldos dos membros
    const membersWithBalance = await Promise.all(
      group.members.map(async (member) => {
        // Total pago pelo membro
        const totalPaid = group.expenses
          .filter(expense => expense.paidById === member.user.id)
          .reduce((sum, expense) => sum + Number(expense.amount), 0)

        // Saldo = total pago - média por pessoa
        const balance = totalPaid - averagePerPerson

        return {
          id: member.user.id,
          name: member.user.name,
          role: member.role,
          permission: member.permission,
          balance: Number(balance.toFixed(2)),
          isCurrentUser: member.user.id === userId
        }
      })
    )

    // Formatar despesas
    const formattedExpenses = group.expenses.map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date.toISOString(),
      status: expense.status,
      paidBy: expense.paidBy.name,
      category: expense.category?.name
    }))

    const groupDetails = {
      id: group.id,
      name: group.name,
      description: group.description,
      members: membersWithBalance,
      expenses: formattedExpenses,
      totalExpenses: Number(totalExpenses.toFixed(2)),
      averagePerPerson: Number(averagePerPerson.toFixed(2))
    }

    return NextResponse.json(groupDetails)

  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar grupo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const tenantId = session.user.tenantId
    const userId = session.user.id
    const body = await request.json()
    
    console.log('📝 Dados recebidos para atualização do grupo:', body)

    // Validar dados recebidos
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { message: 'Nome do grupo é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário é membro do grupo (apenas administradores podem editar)
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!groupMembership) {
      return NextResponse.json(
        { message: 'Apenas administradores podem editar o grupo' },
        { status: 403 }
      )
    }

    // Verificar se o grupo existe e pertence ao tenant
    const existingGroup = await prisma.group.findFirst({
      where: {
        id: groupId,
        tenantId
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar o grupo
    const updatedGroup = await prisma.group.update({
      where: {
        id: groupId
      },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        updatedAt: new Date()
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'GROUP_UPDATED',
        entity: 'GROUP',
        entityId: groupId,
        details: { 
          changes: {
            name: { from: existingGroup.name, to: body.name.trim() },
            description: { from: existingGroup.description, to: body.description?.trim() }
          }
        },
        tenantId,
        userId
      }
    })

    console.log('✅ Grupo atualizado:', updatedGroup)

    return NextResponse.json({
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      updatedAt: updatedGroup.updatedAt
    })

  } catch (error) {
    console.error('Erro ao atualizar grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const tenantId = session.user.tenantId
    const userId = session.user.id

    // Verificar se o usuário é owner do grupo
    const groupMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: 'OWNER'
      }
    })

    if (!groupMembership) {
      return NextResponse.json(
        { message: 'Apenas o proprietário pode excluir o grupo' },
        { status: 403 }
      )
    }

    // Verificar se há despesas confirmadas
    const hasConfirmedExpenses = await prisma.expense.findFirst({
      where: {
        groupId,
        status: 'CONFIRMED'
      }
    })

    if (hasConfirmedExpenses) {
      return NextResponse.json(
        { message: 'Não é possível excluir um grupo com despesas confirmadas' },
        { status: 400 }
      )
    }

    // Excluir grupo e todos os dados relacionados
    await prisma.$transaction(async (tx) => {
      // Excluir pagamentos
      await tx.payment.deleteMany({
        where: {
          expense: {
            groupId
          }
        }
      })

      // Excluir despesas
      await tx.expense.deleteMany({
        where: { groupId }
      })

      // Excluir categorias
      await tx.category.deleteMany({
        where: { groupId }
      })

      // Excluir membros
      await tx.groupMember.deleteMany({
        where: { groupId }
      })

      // Excluir grupo
      await tx.group.delete({
        where: { id: groupId }
      })
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'GROUP_DELETED',
        entity: 'GROUP',
        entityId: groupId,
        details: { deletedBy: userId },
        tenantId,
        userId
      }
    })

    return NextResponse.json({
      message: 'Grupo excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 