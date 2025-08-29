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
        { name: 'Restaurantes', color: '#1E40AF', icon: '🍝' },
        { name: 'Supermercado', color: '#2563EB', icon: '🛒' },
        { name: 'Transporte', color: '#10B981', icon: '🚗' },
        { name: 'Combustível', color: '#059669', icon: '⛽' },
        { name: 'Uber/Taxi', color: '#065F46', icon: '🚕' },
        { name: 'Entretenimento', color: '#F59E0B', icon: '🎬' },
        { name: 'Cinema', color: '#D97706', icon: '🎭' },
        { name: 'Streaming', color: '#B45309', icon: '📺' },
        { name: 'Compras', color: '#EF4444', icon: '🛍️' },
        { name: 'Roupas', color: '#DC2626', icon: '👕' },
        { name: 'Eletrônicos', color: '#B91C1C', icon: '📱' },
        { name: 'Saúde', color: '#8B5CF6', icon: '💊' },
        { name: 'Médico', color: '#7C3AED', icon: '👨‍⚕️' },
        { name: 'Farmácia', color: '#6D28D9', icon: '💉' },
        { name: 'Educação', color: '#06B6D4', icon: '📚' },
        { name: 'Cursos', color: '#0891B2', icon: '🎓' },
        { name: 'Livros', color: '#0E7490', icon: '📖' },
        { name: 'Casa', color: '#84CC16', icon: '🏠' },
        { name: 'Conta de Luz', color: '#65A30D', icon: '💡' },
        { name: 'Conta de Água', color: '#4D7C0F', icon: '💧' },
        { name: 'Internet', color: '#365314', icon: '🌐' },
        { name: 'Aluguel', color: '#1F2937', icon: '🏘️' },
        { name: 'Viagem', color: '#F97316', icon: '✈️' },
        { name: 'Hotel', color: '#EA580C', icon: '🏨' },
        { name: 'Passeios', color: '#C2410C', icon: '🎡' },
        { name: 'Trabalho', color: '#525252', icon: '💼' },
        { name: 'Material de Escritório', color: '#404040', icon: '📝' },
        { name: 'Pets', color: '#EC4899', icon: '🐕' },
        { name: 'Veterinário', color: '#DB2777', icon: '🐾' },
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📂 Criando categoria:', body)

    // Validar dados obrigatórios
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { message: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.color || typeof body.color !== 'string') {
      return NextResponse.json(
        { message: 'Cor é obrigatória' },
        { status: 400 }
      )
    }

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

    // Verificar se já existe uma categoria com esse nome
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: body.name.trim(),
        tenantId: user.tenant.id
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { message: 'Já existe uma categoria com este nome' },
        { status: 409 }
      )
    }

    // Criar a categoria
    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        color: body.color,
        icon: body.icon || '📋',
        tenantId: user.tenant.id
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_CATEGORY',
        entity: 'CATEGORY',
        entityId: category.id,
        userId: user.id,
        tenantId: user.tenant.id,
        details: {
          name: category.name,
          color: category.color,
          icon: category.icon
        }
      }
    })

    console.log('✅ Categoria criada:', category.id)
    return NextResponse.json(category)

  } catch (error) {
    console.error('❌ Erro ao criar categoria:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
