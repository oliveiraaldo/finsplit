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
        type: true,
        plan: true,
        planId: true,
        customPlan: {
          select: {
            id: true,
            name: true,
            price: true
          }
        },
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

    // Transformar dados para incluir nome do plano
    const tenantsWithPlanNames = tenants.map(tenant => ({
      ...tenant,
      planName: tenant.customPlan ? tenant.customPlan.name : (tenant.plan === 'FREE' ? 'Plano Gratuito' : 'Plano Premium'),
      planPrice: tenant.customPlan ? tenant.customPlan.price : (tenant.plan === 'FREE' ? 0 : 29.90)
    }))

    return NextResponse.json(tenantsWithPlanNames)

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

    const { name, planId, status, hasWhatsApp, credits, maxGroups, maxMembers } = await request.json()

    // Validações
    if (!name) {
      return NextResponse.json(
        { message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    if (!planId) {
      return NextResponse.json(
        { message: 'Plano é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar detalhes do plano
    const selectedPlan = await prisma.plan.findUnique({
      where: { id: planId, isActive: true }
    })

    if (!selectedPlan) {
      return NextResponse.json(
        { message: 'Plano não encontrado ou inativo' },
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
        plan: selectedPlan.price === 0 ? 'FREE' : 'PREMIUM',
        planId: selectedPlan.id,
        status: status || 'ACTIVE',
        hasWhatsApp: hasWhatsApp !== undefined ? hasWhatsApp : selectedPlan.hasWhatsApp,
        credits: credits !== undefined ? credits : selectedPlan.creditsIncluded,
        maxGroups: maxGroups !== undefined ? maxGroups : selectedPlan.maxGroups,
        maxMembers: maxMembers !== undefined ? maxMembers : selectedPlan.maxMembers
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
