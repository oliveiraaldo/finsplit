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

    // Buscar todas as despesas do tenant
    const expenses = await prisma.expense.findMany({
      where: {
        group: {
          tenantId
        }
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
    })

    // Formatar as despesas
    const formattedExpenses = expenses.map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date.toISOString(),
      status: expense.status,
      paidBy: expense.paidBy.name,
      groupName: expense.group.name,
      category: expense.category?.name,
      // Campos de recibo
      receiptUrl: expense.receiptUrl,
      receiptData: expense.receiptData,
      mediaType: expense.mediaType,
      documentType: expense.documentType,
      aiExtracted: expense.aiExtracted,
      aiConfidence: expense.aiConfidence ? Number(expense.aiConfidence) : null
    }))

    return NextResponse.json(formattedExpenses)

  } catch (error) {
    console.error('Erro ao buscar despesas:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 