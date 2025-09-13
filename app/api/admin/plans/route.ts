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

    const plans = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        features: true,
        maxGroups: true,
        maxMembers: true,
        hasWhatsApp: true,
        creditsIncluded: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            tenants: true
          }
        }
      },
      orderBy: {
        price: 'asc'
      }
    })

    // Processar features JSON
    const formattedPlans = plans.map(plan => ({
      ...plan,
      type: plan.price > 0 ? 'PREMIUM' : 'FREE', // Determinar tipo baseado no preço
      features: Array.isArray(plan.features) ? plan.features : [],
      price: Number(plan.price)
    }))

    return NextResponse.json(formattedPlans)

  } catch (error) {
    console.error('Erro ao buscar planos:', error)
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

    const { 
      name, 
      description, 
      price, 
      features, 
      maxGroups, 
      maxMembers, 
      hasWhatsApp, 
      creditsIncluded, 
      isActive 
    } = await request.json()

    // Validações
    if (!name) {
      return NextResponse.json(
        { message: 'Nome do plano é obrigatório' },
        { status: 400 }
      )
    }

    if (price < 0) {
      return NextResponse.json(
        { message: 'Preço não pode ser negativo' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe
    const existingPlan = await prisma.plan.findUnique({
      where: { name }
    })

    if (existingPlan) {
      return NextResponse.json(
        { message: 'Nome do plano já está em uso' },
        { status: 400 }
      )
    }

    // Criar plano
    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || null,
        price: price || 0,
        features: features || [],
        maxGroups: maxGroups || 5,
        maxMembers: maxMembers || 10,
        hasWhatsApp: hasWhatsApp || false,
        creditsIncluded: creditsIncluded || 0,
        isActive: isActive !== undefined ? isActive : true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        features: true,
        maxGroups: true,
        maxMembers: true,
        hasWhatsApp: true,
        creditsIncluded: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            tenants: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'CREATE_PLAN',
        entity: 'Plan',
        entityId: plan.id,
        details: `Plano criado: ${plan.name} - R$ ${plan.price}`
      }
    })

    const formattedPlan = {
      ...plan,
      type: plan.price > 0 ? 'PREMIUM' : 'FREE',
      features: Array.isArray(plan.features) ? plan.features : [],
      price: Number(plan.price)
    }

    return NextResponse.json(formattedPlan, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar plano:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
