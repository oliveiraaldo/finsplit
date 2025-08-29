import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId

    // Buscar categorias do tenant
    const categories = await prisma.category.findMany({
      where: {
        tenantId: tenantId
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Se não houver categorias, criar algumas padrão
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Alimentação', color: '#3B82F6', icon: '🍽️' },
        { name: 'Transporte', color: '#10B981', icon: '🚗' },
        { name: 'Entretenimento', color: '#F59E0B', icon: '🎬' },
        { name: 'Compras', color: '#EF4444', icon: '🛍️' },
        { name: 'Saúde', color: '#8B5CF6', icon: '💊' },
        { name: 'Educação', color: '#06B6D4', icon: '📚' },
        { name: 'Casa', color: '#84CC16', icon: '🏠' },
        { name: 'Outros', color: '#6B7280', icon: '📋' }
      ]

      const createdCategories = await Promise.all(
        defaultCategories.map(category =>
          prisma.category.create({
            data: {
              ...category,
              tenantId: tenantId
            }
          })
        )
      )

      return NextResponse.json(createdCategories)
    }

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Erro ao buscar categorias:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
