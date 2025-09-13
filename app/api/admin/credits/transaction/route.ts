import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { tenantId, amount, type, reason } = await request.json()

    // Validações
    if (!tenantId || !amount || !type || !reason) {
      return NextResponse.json(
        { message: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (amount === 0) {
      return NextResponse.json(
        { message: 'Quantidade deve ser diferente de zero' },
        { status: 400 }
      )
    }

    if (!['ADD', 'REMOVE'].includes(type)) {
      return NextResponse.json(
        { message: 'Tipo de transação inválido' },
        { status: 400 }
      )
    }

    // Verificar se tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, credits: true }
    })

    if (!tenant) {
      return NextResponse.json(
        { message: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    // Para remoção, verificar se há créditos suficientes
    if (type === 'REMOVE' && Math.abs(amount) > tenant.credits) {
      return NextResponse.json(
        { message: 'Créditos insuficientes para remoção' },
        { status: 400 }
      )
    }

    // Usar transação do banco para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Criar registro da transação
      const transaction = await tx.creditTransaction.create({
        data: {
          tenantId,
          amount,
          type,
          reason,
          createdById: session.user.id
        },
        select: {
          id: true,
          amount: true,
          type: true,
          reason: true,
          createdAt: true,
          tenant: {
            select: {
              name: true
            }
          },
          createdBy: {
            select: {
              name: true
            }
          }
        }
      })

      // Atualizar créditos do tenant
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          credits: {
            increment: amount
          }
        },
        select: {
          id: true,
          name: true,
          credits: true
        }
      })

      return { transaction, updatedTenant }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: `CREDIT_${type}`,
        entity: 'CreditTransaction',
        entityId: result.transaction.id,
        details: `${type === 'ADD' ? 'Adicionados' : 'Removidos'} ${Math.abs(amount)} créditos para ${tenant.name}. Motivo: ${reason}`
      }
    })

    return NextResponse.json({
      transaction: result.transaction,
      tenant: result.updatedTenant
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao processar transação de crédito:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
