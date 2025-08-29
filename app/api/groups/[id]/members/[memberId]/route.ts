import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT - Atualizar permissões de um membro
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const memberId = params.memberId
    const tenantId = session.user.tenantId
    const userId = session.user.id
    const body = await request.json()
    
    console.log('👤 Dados recebidos para atualizar membro:', { memberId, ...body })

    // Validar dados recebidos
    if (!body.role || !['MEMBER', 'ADMIN', 'OWNER'].includes(body.role)) {
      return NextResponse.json(
        { message: 'Função inválida' },
        { status: 400 }
      )
    }

    if (!body.permission || !['VIEW_ONLY', 'FULL_ACCESS'].includes(body.permission)) {
      return NextResponse.json(
        { message: 'Permissão inválida' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem permissão para editar membros (deve ser OWNER ou ADMIN)
    const userMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!userMembership) {
      return NextResponse.json(
        { message: 'Apenas administradores podem editar membros' },
        { status: 403 }
      )
    }

    // Verificar se o membro a ser editado existe no grupo
    const targetMember = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { message: 'Membro não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se está tentando alterar o próprio papel de OWNER
    if (targetMember.role === 'OWNER' && body.role !== 'OWNER') {
      return NextResponse.json(
        { message: 'Não é possível alterar a função do proprietário' },
        { status: 400 }
      )
    }

    // Verificar se um membro comum está tentando promover alguém a OWNER
    if (body.role === 'OWNER' && userMembership.role !== 'OWNER') {
      return NextResponse.json(
        { message: 'Apenas o proprietário pode promover outros a proprietário' },
        { status: 403 }
      )
    }

    // Verificar se existe um grupo sem dono (se estiver removendo o último OWNER)
    if (targetMember.role === 'OWNER' && body.role !== 'OWNER') {
      const ownerCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: 'OWNER'
        }
      })
      
      if (ownerCount <= 1) {
        return NextResponse.json(
          { message: 'Deve haver pelo menos um proprietário no grupo' },
          { status: 400 }
        )
      }
    }

    // Atualizar o membro
    const updatedMember = await prisma.groupMember.update({
      where: {
        id: memberId
      },
      data: {
        role: body.role,
        permission: body.permission
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_UPDATED',
        entity: 'GROUP',
        entityId: groupId,
        details: { 
          targetMemberId: memberId,
          targetMemberName: targetMember.user.name,
          oldRole: targetMember.role,
          newRole: body.role,
          oldPermission: targetMember.permission,
          newPermission: body.permission,
          updatedBy: userId
        },
        tenantId,
        userId
      }
    })

    // Retornar dados do membro atualizado
    const memberData = {
      id: updatedMember.user.id,
      name: updatedMember.user.name,
      role: updatedMember.role,
      permission: updatedMember.permission,
      email: updatedMember.user.email,
      phone: updatedMember.user.phone,
      balance: 0 // Recalcular se necessário
    }

    console.log('✅ Membro atualizado:', memberData)

    return NextResponse.json(memberData)

  } catch (error) {
    console.error('Erro ao atualizar membro:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remover membro do grupo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const groupId = params.id
    const memberId = params.memberId
    const tenantId = session.user.tenantId
    const userId = session.user.id
    
    console.log('🗑️ Removendo membro:', { groupId, memberId })

    // Verificar se o usuário tem permissão para remover membros (deve ser OWNER ou ADMIN)
    const userMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })

    if (!userMembership) {
      return NextResponse.json(
        { message: 'Apenas administradores podem remover membros' },
        { status: 403 }
      )
    }

    // Verificar se o membro a ser removido existe
    const targetMember = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { message: 'Membro não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir remover o último OWNER
    if (targetMember.role === 'OWNER') {
      const ownerCount = await prisma.groupMember.count({
        where: {
          groupId,
          role: 'OWNER'
        }
      })
      
      if (ownerCount <= 1) {
        return NextResponse.json(
          { message: 'Não é possível remover o último proprietário do grupo' },
          { status: 400 }
        )
      }
    }

    // Verificar se o membro tem despesas pendentes
    const pendingExpenses = await prisma.expense.count({
      where: {
        paidById: targetMember.user.id,
        groupId,
        status: 'PENDING'
      }
    })

    if (pendingExpenses > 0) {
      return NextResponse.json(
        { message: `Membro possui ${pendingExpenses} despesa(s) pendente(s). Resolva-as antes de remover.` },
        { status: 400 }
      )
    }

    // Remover o membro
    await prisma.groupMember.delete({
      where: {
        id: memberId
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_REMOVED',
        entity: 'GROUP',
        entityId: groupId,
        details: { 
          removedMemberId: targetMember.user.id,
          removedMemberName: targetMember.user.name,
          removedRole: targetMember.role,
          removedBy: userId
        },
        tenantId,
        userId
      }
    })

    console.log('✅ Membro removido com sucesso')

    return NextResponse.json({
      message: 'Membro removido com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover membro:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
