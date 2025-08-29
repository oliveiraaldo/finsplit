import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar o arquivo
    const file = await prisma.uploadedFile.findUnique({
      where: { id: params.id },
      include: {
        tenant: true,
        uploadedBy: true
      }
    })

    if (!file) {
      return NextResponse.json(
        { message: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Buscar o usuário da sessão
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user?.tenant) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o arquivo pertence ao mesmo tenant
    if (file.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { message: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Converter base64 de volta para buffer
    const buffer = Buffer.from(file.base64Data, 'base64')

    // Retornar o arquivo com headers apropriados
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `inline; filename="${file.originalName}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
      },
    })

  } catch (error) {
    console.error('❌ Erro ao servir arquivo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
