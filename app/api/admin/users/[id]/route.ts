import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { name, email, phone, role, password } = await request.json()
    const userId = params.id

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Validações
    if (!name || !email) {
      return NextResponse.json(
        { message: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se email já existe (exceto para o próprio usuário)
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json(
          { message: 'Email já está em uso' },
          { status: 400 }
        )
      }
    }

    // Verificar se telefone já existe (exceto para o próprio usuário)
    if (phone && phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone }
      })

      if (phoneExists) {
        return NextResponse.json(
          { message: 'Telefone já está em uso' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      name,
      email,
      phone: phone || null,
      role: role || existingUser.role
    }

    // Se senha foi fornecida, fazer hash
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        }
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: userId,
        details: `Usuário atualizado: ${updatedUser.name} (${updatedUser.email})`
      }
    })

    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
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

    const userId = params.id

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            users: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir excluir o próprio usuário
    if (userId === session.user.id) {
      return NextResponse.json(
        { message: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      )
    }

    // Verificar se é o último admin
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: 'Não é possível excluir o último administrador' },
          { status: 400 }
        )
      }
    }

    // Verificar se é o último usuário do tenant
    const isLastUserInTenant = existingUser.tenant.users.length <= 1
    
    if (isLastUserInTenant) {
      console.log(`🗂️ Usuário ${existingUser.name} é o último do tenant ${existingUser.tenant.name}. Deletando tenant também...`)
      
      // Se for o último usuário, deletar o tenant inteiro (CASCADE cuidará de tudo)
      await prisma.tenant.delete({
        where: { id: existingUser.tenantId }
      })

      // Log de auditoria para tenant deletado
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          action: 'DELETE_TENANT',
          entity: 'Tenant',
          entityId: existingUser.tenantId,
          details: `Tenant '${existingUser.tenant.name}' excluído automaticamente (último usuário '${existingUser.name}' foi removido)`
        }
      })
      
      return NextResponse.json({ 
        message: `Usuário e tenant excluídos com sucesso (${existingUser.name} era o último usuário do tenant ${existingUser.tenant.name})` 
      })
    } else {
      console.log(`👤 Deletando apenas usuário ${existingUser.name} (tenant ${existingUser.tenant.name} tem outros usuários)`)
      
      // Se não for o último usuário, deletar apenas o usuário
      await prisma.user.delete({
        where: { id: userId }
      })

      // Log de auditoria para usuário deletado
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          action: 'DELETE_USER',
          entity: 'User',
          entityId: userId,
          details: `Usuário excluído: ${existingUser.name} (${existingUser.email}) - Tenant '${existingUser.tenant.name}' mantido`
        }
      })

      return NextResponse.json({ message: 'Usuário excluído com sucesso' })
    }

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
