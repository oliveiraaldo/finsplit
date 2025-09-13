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

    const { name, plan, status, hasWhatsApp, credits, maxGroups, maxMembers } = await request.json()
    const tenantId = params.id

    // Verificar se tenant existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!existingTenant) {
      return NextResponse.json(
        { message: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Validações
    if (!name) {
      return NextResponse.json(
        { message: 'Nome da empresa é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe (exceto para o próprio tenant)
    if (name !== existingTenant.name) {
      const nameExists = await prisma.tenant.findFirst({
        where: { 
          name,
          id: { not: tenantId }
        }
      })

      if (nameExists) {
        return NextResponse.json(
          { message: 'Nome da empresa já está em uso' },
          { status: 400 }
        )
      }
    }

    // Atualizar tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name,
        plan: plan || existingTenant.plan,
        status: status || existingTenant.status,
        hasWhatsApp: hasWhatsApp !== undefined ? hasWhatsApp : existingTenant.hasWhatsApp,
        credits: credits !== undefined ? credits : existingTenant.credits,
        maxGroups: maxGroups !== undefined ? maxGroups : existingTenant.maxGroups,
        maxMembers: maxMembers !== undefined ? maxMembers : existingTenant.maxMembers
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
        action: 'UPDATE_TENANT',
        entity: 'Tenant',
        entityId: tenantId,
        details: `Tenant atualizado: ${updatedTenant.name}`
      }
    })

    return NextResponse.json(updatedTenant)

  } catch (error) {
    console.error('Erro ao atualizar tenant:', error)
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

    const tenantId = params.id

    // Verificar se tenant existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            groups: true
          }
        }
      }
    })

    if (!existingTenant) {
      return NextResponse.json(
        { message: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir excluir tenant com usuários
    if (existingTenant._count.users > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir tenant com usuários ativos' },
        { status: 400 }
      )
    }

    // Não permitir excluir tenant com grupos
    if (existingTenant._count.groups > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir tenant com grupos ativos' },
        { status: 400 }
      )
    }

    // Excluir tenant
    await prisma.tenant.delete({
      where: { id: tenantId }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'DELETE_TENANT',
        entity: 'Tenant',
        entityId: tenantId,
        details: `Tenant excluído: ${existingTenant.name}`
      }
    })

    return NextResponse.json({ message: 'Tenant excluído com sucesso' })

  } catch (error) {
    console.error('Erro ao excluir tenant:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
