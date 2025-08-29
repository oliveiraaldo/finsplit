import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = path.extname(file.name)
    const fileName = `${timestamp}-${randomString}${fileExtension}`
    
    // Criar diretório se não existir
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Diretório já existe, tudo bem
    }

    // Salvar arquivo
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    await writeFile(filePath, buffer)

    // URL pública do arquivo
    const fileUrl = `/uploads/receipts/${fileName}`

    console.log('📎 Arquivo salvo:', {
      originalName: file.name,
      fileName,
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
