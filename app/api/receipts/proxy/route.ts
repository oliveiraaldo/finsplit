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

    const { searchParams } = new URL(request.url)
    const mediaUrl = searchParams.get('url')
    const expenseId = searchParams.get('expenseId')

    if (!mediaUrl || !expenseId) {
      return NextResponse.json(
        { message: 'URL da mídia e ID da despesa são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se a despesa pertence ao tenant do usuário
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        group: {
          tenantId: session.user.tenantId
        }
      }
    })

    if (!expense) {
      return NextResponse.json(
        { message: 'Despesa não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a URL corresponde à URL salva na despesa
    if (expense.receiptUrl !== mediaUrl) {
      return NextResponse.json(
        { message: 'URL de mídia inválida' },
        { status: 403 }
      )
    }

    // Se for URL do Twilio, usar autenticação
    if (mediaUrl.includes('api.twilio.com')) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      
      if (!accountSid || !authToken) {
        throw new Error('Credenciais Twilio não configuradas')
      }
      
      // Criar headers de autenticação Basic Auth
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      
      const mediaResponse = await fetch(mediaUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'FinSplit/1.0'
        }
      })
      
      if (!mediaResponse.ok) {
        throw new Error(`Erro ao baixar mídia: ${mediaResponse.status} ${mediaResponse.statusText}`)
      }
      
      const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
      const mediaBuffer = await mediaResponse.arrayBuffer()
      
      // Retornar a imagem com headers apropriados
      return new Response(mediaBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
          'Content-Disposition': 'inline'
        }
      })
    } else {
      // Para outras URLs, fazer proxy simples
      const mediaResponse = await fetch(mediaUrl)
      
      if (!mediaResponse.ok) {
        throw new Error(`Erro ao baixar mídia: ${mediaResponse.status} ${mediaResponse.statusText}`)
      }
      
      const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
      const mediaBuffer = await mediaResponse.arrayBuffer()
      
      return new Response(mediaBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Content-Disposition': 'inline'
        }
      })
    }

  } catch (error) {
    console.error('Erro no proxy de receipt:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
