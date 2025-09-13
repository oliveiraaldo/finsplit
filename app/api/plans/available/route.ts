import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        features: true,
        maxGroups: true,
        maxMembers: true,
        hasWhatsApp: true,
        creditsIncluded: true
      },
      orderBy: [
        { price: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(plans)

  } catch (error) {
    console.error('Erro ao buscar planos disponíveis:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
