import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        credits: true,
        plan: true,
        status: true,
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: [
        { credits: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(tenants)

  } catch (error) {
    console.error('Erro ao buscar tenants para créditos:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
