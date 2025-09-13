import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const groupId = params.id

    // Verificar se o grupo existe
    const existingGroup = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        tenant: {
          select: { name: true }
        },
        members: {
          select: {
            user: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: {
            expenses: true
          }
        }
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    // Usar transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      // 1. Excluir todos os pagamentos relacionados às despesas do grupo
      await tx.payment.deleteMany({
        where: {
          expense: {
            groupId: groupId
          }
        }
      })

      // 2. Excluir todas as despesas do grupo
      await tx.expense.deleteMany({
        where: {
          groupId: groupId
        }
      })

      // 3. Excluir todos os membros do grupo
      await tx.groupMember.deleteMany({
        where: {
          groupId: groupId
        }
      })

      // 4. Excluir o grupo
      await tx.group.delete({
        where: { id: groupId }
      })
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'DELETE_GROUP',
        entity: 'Group',
        entityId: groupId,
        details: `Grupo excluído: ${existingGroup.name} (${existingGroup.tenant.name}) - ${existingGroup.members.length} membros, ${existingGroup._count.expenses} despesas`
      }
    })

    return NextResponse.json({ 
      message: 'Grupo excluído com sucesso',
      deletedGroup: {
        name: existingGroup.name,
        tenant: existingGroup.tenant.name,
        membersCount: existingGroup.members.length,
        expensesCount: existingGroup._count.expenses
      }
    })

  } catch (error) {
    console.error('Erro ao excluir grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
