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
    const userId = session.user.id

    // Buscar grupos do usuário com estatísticas
    const userGroups = await prisma.group.findMany({
      where: {
        tenantId,
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        expenses: {
          where: {
            status: 'CONFIRMED'
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    // Calcular estatísticas para cada grupo
    const groupsWithStats = await Promise.all(
      userGroups.map(async (group) => {
        // Total de despesas confirmadas
        const totalExpenses = group.expenses.reduce((sum, expense) => {
          return sum + Number(expense.amount)
        }, 0)

        // Última atividade (data da despesa mais recente)
        const lastExpense = await prisma.expense.findFirst({
          where: {
            groupId: group.id,
            status: 'CONFIRMED'
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        const lastActivity = lastExpense?.createdAt || group.createdAt

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          memberCount: group._count.members,
          totalExpenses,
          lastActivity: lastActivity.toISOString(),
          memberNames: group.members.map(member => member.user.name)
        }
      })
    )

    // Ordenar por última atividade
    groupsWithStats.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )

    return NextResponse.json(groupsWithStats)

  } catch (error) {
    console.error('Erro ao buscar grupos:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 