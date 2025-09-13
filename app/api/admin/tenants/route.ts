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

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        hasWhatsApp: true,
        credits: true,
        maxGroups: true,
        maxMembers: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            groups: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(tenants)

  } catch (error) {
    console.error('Erro ao buscar tenants:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { name, plan, status, hasWhatsApp, credits, maxGroups, maxMembers } = await request.json()

    // Validações
    if (!name) {
      return NextResponse.json(
        { message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe
    const existingTenant = await prisma.tenant.findFirst({
      where: { name }
    })

    if (existingTenant) {
      return NextResponse.json(
        { message: 'Nome da empresa já está em uso' },
        { status: 400 }
      )
    }

    // Criar tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        plan: plan || 'FREE',
        status: status || 'ACTIVE',
        hasWhatsApp: hasWhatsApp || false,
        credits: credits || 0,
        maxGroups: maxGroups || 5,
        maxMembers: maxMembers || 10
      },
      select: {
        id: true,
        name: true,
        plan: true,
        status: true,
        hasWhatsApp: true,
        credits: true,
        maxGroups: true,
        maxMembers: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            groups: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'CREATE_TENANT',
        entity: 'Tenant',
        entityId: tenant.id,
        details: `Tenant criado: ${tenant.name}`
      }
    })

    return NextResponse.json(tenant, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar tenant:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
