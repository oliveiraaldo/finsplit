import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId

    // Buscar despesas recentes do tenant
    const recentExpenses = await prisma.expense.findMany({
      where: {
        group: { tenantId }
      },
      include: {
        paidBy: {
          select: {
            name: true
          }
        },
        group: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Limitar a 5 despesas mais recentes
    })

    // Formatar dados para o frontend
    const formattedExpenses = recentExpenses.map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date.toISOString(),
      status: expense.status,
      paidBy: {
        name: expense.paidBy.name
      },
      groupName: expense.group.name
    }))

    return NextResponse.json(formattedExpenses)

  } catch (error) {
    console.error('Erro ao buscar despesas recentes:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 