import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Adicionar membro ao grupo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const tenantId = session.user.tenantId
    const body = await request.json()
    
    console.log('👥 Dados recebidos para adicionar membro:', body)

    // Validar dados recebidos
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { message: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.email && !body.phone) {
      return NextResponse.json(
        { message: 'Email ou telefone é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o grupo existe e pertence ao tenant
    const existingGroup = await prisma.group.findFirst({
      where: {
        id: groupId,
        tenantId
      }
    })

    if (!existingGroup) {
      return NextResponse.json(
        { message: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já existe um usuário com este email ou telefone
    let user = null
    if (body.email) {
      user = await prisma.user.findUnique({
        where: { email: body.email }
      })
    }
    
    if (!user && body.phone) {
      user = await prisma.user.findUnique({
        where: { phone: body.phone }
      })
    }

    // Se o usuário não existe, criar um novo
    if (!user) {
      // Para usuários criados via convite, criar sem senha (devem fazer signup depois)
      user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email || `temp_${Date.now()}@temp.com`,
          phone: body.phone,
          password: 'temp_password', // Usuário deve redefinir ao fazer login
          tenantId: tenantId,
          role: 'CLIENT'
        }
      })
    }

    // Verificar se o usuário já é membro do grupo
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: user.id,
          groupId: groupId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { message: 'Usuário já é membro deste grupo' },
        { status: 400 }
      )
    }

    // Adicionar o usuário como membro do grupo
    const groupMember = await prisma.groupMember.create({
      data: {
        userId: user.id,
        groupId: groupId,
        role: body.role || 'MEMBER'
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
        action: 'MEMBER_ADDED',
        entity: 'GROUP',
        entityId: groupId,
        details: { 
          memberId: user.id,
          memberName: user.name,
          role: body.role || 'MEMBER'
        },
        tenantId,
        userId: session.user.id
      }
    })

    // Retornar dados do membro para atualizar a UI
    const memberData = {
      id: user.id,
      name: user.name,
      role: body.role || 'MEMBER',
      balance: 0, // Saldo inicial
      email: user.email,
      phone: user.phone
    }

    return NextResponse.json(memberData)

  } catch (error) {
    console.error('Erro ao adicionar membro:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
