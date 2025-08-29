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

    // Buscar estatísticas em paralelo
    const [totalGroups, totalExpenses, totalMembers, monthlySpending] = await Promise.all([
      // Total de grupos
      prisma.group.count({
        where: { tenantId }
      }),
      
      // Total de despesas
      prisma.expense.count({
        where: { 
          group: { tenantId },
          status: 'CONFIRMED'
        }
      }),
      
      // Total de membros únicos
      prisma.user.count({
        where: { 
          tenantId,
          groups: {
            some: {}
          }
        }
      }),
      
      // Gastos do mês atual
      prisma.expense.aggregate({
        where: {
          group: { tenantId },
          status: 'CONFIRMED',
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          }
        },
        _sum: { amount: true }
      })
    ])

    const stats = {
      totalGroups,
      totalExpenses,
      totalMembers,
      monthlySpending: monthlySpending._sum.amount || 0
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 