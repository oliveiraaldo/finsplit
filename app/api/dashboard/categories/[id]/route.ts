import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const categoryId = params.id
    const body = await request.json()
    console.log('📂 Editando categoria:', categoryId, body)

    // Buscar o usuário com tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Usuário ou tenant não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se a categoria existe e pertence ao tenant
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId: user.tenant.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { message: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Validar dados se fornecidos
    if (body.name && typeof body.name !== 'string') {
      return NextResponse.json(
        { message: 'Nome deve ser uma string' },
        { status: 400 }
      )
    }

    if (body.color && typeof body.color !== 'string') {
      return NextResponse.json(
        { message: 'Cor deve ser uma string' },
        { status: 400 }
      )
    }

    // Verificar se já existe outra categoria com o mesmo nome
    if (body.name && body.name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: body.name.trim(),
          tenantId: user.tenant.id,
          id: { not: categoryId }
        }
      })

      if (duplicateCategory) {
        return NextResponse.json(
          { message: 'Já existe uma categoria com este nome' },
          { status: 409 }
        )
      }
    }

    // Atualizar a categoria
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.color && { color: body.color }),
        ...(body.icon && { icon: body.icon })
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_CATEGORY',
        entity: 'CATEGORY',
        entityId: categoryId,
        userId: user.id,
        tenantId: user.tenant.id,
        details: {
          oldName: existingCategory.name,
          newName: updatedCategory.name,
          oldColor: existingCategory.color,
          newColor: updatedCategory.color,
          changes: body
        }
      }
    })

    console.log('✅ Categoria atualizada:', categoryId)
    return NextResponse.json(updatedCategory)

  } catch (error) {
    console.error('❌ Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const categoryId = params.id
    console.log('🗑️ Deletando categoria:', categoryId)

    // Buscar o usuário com tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Usuário ou tenant não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se a categoria existe e pertence ao tenant
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId: user.tenant.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { message: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se existem despesas usando esta categoria
    const expensesCount = await prisma.expense.count({
      where: {
        categoryId: categoryId
      }
    })

    if (expensesCount > 0) {
      return NextResponse.json(
        { message: `Não é possível excluir esta categoria pois ela está sendo usada em ${expensesCount} despesa(s)` },
        { status: 409 }
      )
    }

    // Deletar a categoria
    await prisma.category.delete({
      where: { id: categoryId }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_CATEGORY',
        entity: 'CATEGORY',
        entityId: categoryId,
        userId: user.id,
        tenantId: user.tenant.id,
        details: {
          name: existingCategory.name,
          color: existingCategory.color,
          icon: existingCategory.icon
        }
      }
    })

    console.log('✅ Categoria deletada:', categoryId)
    return NextResponse.json({ message: 'Categoria deletada com sucesso' })

  } catch (error) {
    console.error('❌ Erro ao deletar categoria:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
