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

    const { searchParams } = new URL(request.url)
    
    // Parâmetros de busca e filtros
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const action = searchParams.get('action') || ''
    const entity = searchParams.get('entity') || ''
    const userId = searchParams.get('userId') || ''
    const tenantId = searchParams.get('tenantId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    if (entity) {
      where.entity = { contains: entity, mode: 'insensitive' }
    }

    if (userId) {
      where.userId = userId
    }

    if (tenantId) {
      where.tenantId = tenantId
    }

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate)
      }
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate)
      }
    }

    // Buscar logs com paginação
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          tenant: {
            select: {
              name: true
            }
          },
          group: {
            select: {
              name: true
            }
          },
          expense: {
            select: {
              description: true,
              amount: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: (page - 1) * limit
      }),
      prisma.auditLog.count({ where })
    ])

    // Estatísticas rápidas
    const stats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      } : {},
      _count: true,
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    })

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        user: log.user,
        tenant: log.tenant,
        group: log.group,
        expense: log.expense
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
