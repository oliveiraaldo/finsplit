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

    const transactions = await prisma.creditTransaction.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar para performance
    })

    return NextResponse.json(transactions)

  } catch (error) {
    console.error('Erro ao buscar transações de crédito:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
