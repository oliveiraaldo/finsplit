import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const planId = params.id

    // Verificar se plano existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

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

    // Verificar se nome já existe (exceto para o próprio plano)
    if (name !== existingPlan.name) {
      const nameExists = await prisma.plan.findUnique({
        where: { name }
      })

      if (nameExists) {
        return NextResponse.json(
          { message: 'Nome do plano já está em uso' },
          { status: 400 }
        )
      }
    }

    // Atualizar plano
    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: {
        name,
        description: description || null,
        price: price !== undefined ? price : existingPlan.price,
        features: features || existingPlan.features,
        maxGroups: maxGroups !== undefined ? maxGroups : existingPlan.maxGroups,
        maxMembers: maxMembers !== undefined ? maxMembers : existingPlan.maxMembers,
        hasWhatsApp: hasWhatsApp !== undefined ? hasWhatsApp : existingPlan.hasWhatsApp,
        creditsIncluded: creditsIncluded !== undefined ? creditsIncluded : existingPlan.creditsIncluded,
        isActive: isActive !== undefined ? isActive : existingPlan.isActive
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
        action: 'UPDATE_PLAN',
        entity: 'Plan',
        entityId: planId,
        details: `Plano atualizado: ${updatedPlan.name} - R$ ${updatedPlan.price}`
      }
    })

    const formattedPlan = {
      ...updatedPlan,
      type: updatedPlan.price > 0 ? 'PREMIUM' : 'FREE',
      features: Array.isArray(updatedPlan.features) ? updatedPlan.features : [],
      price: Number(updatedPlan.price)
    }

    return NextResponse.json(formattedPlan)

  } catch (error) {
    console.error('Erro ao atualizar plano:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const planId = params.id

    // Verificar se plano existe
    const existingPlan = await prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            tenants: true
          }
        }
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Plano não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir excluir plano com tenants
    if (existingPlan._count.tenants > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir plano com tenants ativos' },
        { status: 400 }
      )
    }

    // Excluir plano
    await prisma.plan.delete({
      where: { id: planId }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'DELETE_PLAN',
        entity: 'Plan',
        entityId: planId,
        details: `Plano excluído: ${existingPlan.name}`
      }
    })

    return NextResponse.json({ message: 'Plano excluído com sucesso' })

  } catch (error) {
    console.error('Erro ao excluir plano:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
