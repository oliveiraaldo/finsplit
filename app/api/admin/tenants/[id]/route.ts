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

    const { name, planId, status, hasWhatsApp, credits, maxGroups, maxMembers } = await request.json()
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
        plan: selectedPlan.price === 0 ? 'FREE' : 'PREMIUM',
        planId: selectedPlan.id,
        status: status || existingTenant.status,
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
      include: {
        users: true,
        groups: {
          include: {
            expenses: true,
            members: true
          }
        },
        categories: true,
        uploadedFiles: true,
        auditLogs: true,
        creditTransactions: true,
        subscriptions: true
      }
    })

    if (!existingTenant) {
      return NextResponse.json(
        { message: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    console.log(`🗑️  Iniciando exclusão CASCADE do tenant: ${existingTenant.name}`)

    // Excluir tudo em transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      // 1. Remover pagamentos relacionados às despesas dos grupos
      for (const group of existingTenant.groups) {
        if (group.expenses.length > 0) {
          const expenseIds = group.expenses.map(e => e.id)
          await tx.payment.deleteMany({
            where: { expenseId: { in: expenseIds } }
          })
          console.log(`   ✅ Removidos pagamentos do grupo ${group.name}`)
        }
      }

      // 2. Remover despesas dos grupos
      for (const group of existingTenant.groups) {
        await tx.expense.deleteMany({
          where: { groupId: group.id }
        })
        console.log(`   ✅ Removidas despesas do grupo ${group.name}`)
      }

      // 3. Remover membros dos grupos
      for (const group of existingTenant.groups) {
        await tx.groupMember.deleteMany({
          where: { groupId: group.id }
        })
        console.log(`   ✅ Removidos membros do grupo ${group.name}`)
      }

      // 4. Remover grupos
      await tx.group.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidos ${existingTenant.groups.length} grupos`)

      // 5. Remover arquivos upload
      await tx.uploadedFile.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidos ${existingTenant.uploadedFiles.length} arquivos`)

      // 6. Remover transações de crédito
      await tx.creditTransaction.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidas ${existingTenant.creditTransactions.length} transações de crédito`)

      // 7. Remover assinaturas
      await tx.subscription.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidas ${existingTenant.subscriptions.length} assinaturas`)

      // 8. Remover logs de auditoria (opcional, pois pode ser importante manter histórico)
      await tx.auditLog.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidos ${existingTenant.auditLogs.length} logs de auditoria`)

      // 9. Remover categorias
      await tx.category.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidas ${existingTenant.categories.length} categorias`)

      // 10. Remover usuários
      await tx.user.deleteMany({
        where: { tenantId: tenantId }
      })
      console.log(`   ✅ Removidos ${existingTenant.users.length} usuários`)

      // 11. Finalmente, remover o tenant
      await tx.tenant.delete({
        where: { id: tenantId }
      })
      console.log(`   ✅ Tenant ${existingTenant.name} removido completamente`)
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
