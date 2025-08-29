import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PermissionChecker, UserGroupContext } from '@/lib/permissions'

// GET - Buscar despesa específica
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

    const expenseId = params.id
    const tenantId = session.user.tenantId

    // Verificar se a despesa existe e se o usuário tem acesso ao grupo
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          members: {
            some: {
              userId: session.user.id
            }
          }
        }
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
            name: true,
            description: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        },
        payments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!expense) {
      return NextResponse.json(
        { message: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(expense)

  } catch (error) {
    console.error('Erro ao buscar despesa:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar despesa
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

    const expenseId = params.id
    const tenantId = session.user.tenantId
    const body = await request.json()
    console.log('📝 Dados recebidos para atualização:', body)

    // Validar dados recebidos
    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { message: 'Descrição é obrigatória' },
        { status: 400 }
      )
    }

    if (typeof body.amount !== 'number' || isNaN(body.amount)) {
      return NextResponse.json(
        { message: 'Valor deve ser um número válido' },
        { status: 400 }
      )
    }

    if (!body.date) {
      return NextResponse.json(
        { message: 'Data é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se a despesa existe e pertence ao tenant
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          tenantId
        }
      }
    })

    if (!existingExpense) {
      return NextResponse.json(
        { message: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar a despesa
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: body.description,
        amount: body.amount,
        date: new Date(body.date),
        status: body.status,
        categoryId: body.categoryId || null
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
            name: true,
            description: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_UPDATED',
        entity: 'EXPENSE',
        entityId: expenseId,
        details: { 
          updatedFields: Object.keys(body),
          previousValues: existingExpense,
          newValues: body
        },
        tenantId,
        userId: session.user.id
      }
    })

    return NextResponse.json(updatedExpense)

  } catch (error) {
    console.error('Erro ao atualizar despesa:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir despesa
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

    const expenseId = params.id
    const tenantId = session.user.tenantId

    // Verificar se a despesa existe e pertence ao tenant
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          tenantId
        }
      }
    })

    if (!existingExpense) {
      return NextResponse.json(
        { message: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Excluir a despesa (cascade também excluirá pagamentos)
    await prisma.expense.delete({
      where: { id: expenseId }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'EXPENSE_DELETED',
        entity: 'EXPENSE',
        entityId: expenseId,
        details: { 
          deletedExpense: existingExpense
        },
        tenantId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ message: 'Despesa excluída com sucesso' })

  } catch (error) {
    console.error('Erro ao excluir despesa:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 