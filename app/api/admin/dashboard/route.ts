import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    // Buscar estatísticas gerais
    const [
      totalUsers,
      totalTenants,
      totalExpenses,
      totalCreditsUsed,
      recentActivity
    ] = await Promise.all([
      // Total de usuários
      prisma.user.count(),
      
      // Total de tenants
      prisma.tenant.count(),
      
      // Total de despesas
      prisma.expense.count(),
      
      // Total de créditos utilizados (soma dos créditos de todos os tenants)
      prisma.tenant.aggregate({
        _sum: {
          credits: true
        }
      }),
      
      // Atividade recente dos logs de auditoria
      prisma.auditLog.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    ])

    // Usuários ativos nas últimas 24h (baseado em logs de auditoria)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const activeUsers = await prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: yesterday
        }
      },
      distinct: ['userId'],
      select: {
        userId: true
      }
    })

    // Mensagens WhatsApp (baseado em logs de auditoria com ação relacionada ao WhatsApp)
    const whatsappMessages = await prisma.auditLog.count({
      where: {
        action: {
          contains: 'whatsapp'
        },
        createdAt: {
          gte: yesterday
        }
      }
    })

    // Formatar atividade recente
    const formattedActivity = recentActivity.map(log => ({
      id: log.id,
      type: log.action,
      description: `${log.action} - ${log.entity}`,
      timestamp: log.createdAt.toLocaleString('pt-BR'),
      user: log.user?.name || 'Sistema'
    }))

    const stats = {
      totalUsers,
      totalTenants,
      totalExpenses,
      totalCreditsUsed: totalCreditsUsed._sum.credits || 0,
      activeUsers: activeUsers.length,
      whatsappMessages,
      recentActivity: formattedActivity
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard admin:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
