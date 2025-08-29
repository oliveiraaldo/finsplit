import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { message: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'application/pdf'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'Arquivo muito grande. Máximo 10MB' },
        { status: 400 }
      )
    }

    // Converter arquivo para base64 para salvar no banco
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString('base64')
    
    // Criar registro no banco para o arquivo
    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        base64Data: base64Data,
        tenantId: user.tenant.id,
        uploadedById: user.id
      }
    })

    // URL para acessar o arquivo via API
    const fileUrl = `/api/files/${uploadedFile.id}`

    console.log('📎 Arquivo salvo:', {
      id: uploadedFile.id,
      originalName: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl
    })

    return NextResponse.json({
      url: fileUrl,
      originalName: file.name,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('❌ Erro no upload:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
