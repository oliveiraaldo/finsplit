import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { imageBase64, description, category: userCategory } = await request.json()

    if (!imageBase64) {
      return NextResponse.json(
        { message: 'Imagem é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem IA habilitada
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { tenant: true }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem IA habilitada
    if (!user.tenant.hasAI) {
      return NextResponse.json(
        { message: 'Seu plano não inclui IA' },
        { status: 403 }
      )
    }

    // Verificar créditos
    if (user.tenant.credits <= 0) {
      return NextResponse.json(
        { message: 'Créditos insuficientes' },
        { status: 403 }
      )
    }

    // Extrair dados com OpenAI
    const extractionResult = await extractReceiptData(imageBase64, description)

    if (!extractionResult.success) {
      return NextResponse.json(
        { message: 'Falha na extração dos dados: ' + extractionResult.error },
        { status: 400 }
      )
    }

    // Consumir crédito
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { credits: { decrement: 1 } }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'AI_RECEIPT_EXTRACTION',
        entity: 'USER',
        entityId: user.id,
        details: { 
          success: true,
          confidence: extractionResult.confidence,
          extractedData: extractionResult.data
        },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    return NextResponse.json({
      message: 'Dados extraídos com sucesso',
      data: extractionResult.data,
      confidence: extractionResult.confidence
    })

  } catch (error) {
    console.error('Erro na extração de recibo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function extractReceiptData(imageBase64: string, description?: string) {
  try {
    console.log('🤖 Tentando extração com OpenAI...')
    
    const prompt = `
      Você é um motor de extração estruturada de dados de recibos, comprovantes bancários, notas fiscais e transferências brasileiras.
      Receberá uma imagem e deve retornar apenas JSON, seguindo o esquema abaixo.
      Se um campo não existir, use null. Não invente valores.

      IMPORTANTE: Para comprovantes bancários (PIX, TED, DOC), o "recebedor" é quem RECEBEU o dinheiro.
      Para recibos de compra, o "estabelecimento" é onde foi feita a compra.

      Esquema JSON esperado:
      {
        "recebedor": {
          "nome": "Nome do recebedor (pessoa ou empresa)",
          "tipo": "pessoa, empresa, estabelecimento",
          "documento": "CPF ou CNPJ apenas dígitos",
          "banco": "nome do banco se aplicável",
          "conta": "número da conta se aplicável"
        },
        "estabelecimento": {
          "nome": "Nome do estabelecimento (para compras)",
          "tipo": "tipo do estabelecimento",
          "cnpj": "CNPJ apenas dígitos",
          "endereco": "endereço completo",
          "cidade": "cidade",
          "uf": "UF",
          "telefone": "telefone apenas dígitos"
        },
        "documento": {
          "numero_recibo": "número do recibo",
          "protocolo": "protocolo se houver",
          "tipo": "recibo, nota fiscal, comprovante bancário, transferência"
        },
        "datas": {
          "emissao": "data de emissão YYYY-MM-DD",
          "previsao_entrega": "data de previsão se houver"
        },
        "itens": [
          {
            "descricao": "descrição do item",
            "quantidade": 1,
            "valor_total": valor_total_numerico
          }
        ],
        "totais": {
          "total_final": valor_total_final_numerico,
          "moeda": "BRL",
          "pago": true/false
        },
        "tipo_transacao": "transferência, pagamento, compra, saque, depósito",
        "metodo_pagamento": "PIX, TED, DOC, dinheiro, cartão, boleto"
      }

      ${description ? `Descrição adicional: ${description}` : ''}
      
      Responda APENAS com o JSON válido, sem texto adicional.
    `

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Modelo atualizado (gpt-4o inclui vision)
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log('❌ OpenAI retornou conteúdo vazio')
      return { success: false, error: 'Sem resposta da IA' }
    }

    console.log('📝 Resposta bruta da OpenAI:', content.substring(0, 200) + '...')

    // Tentar extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.log('❌ Não foi possível encontrar JSON na resposta')
      return { success: false, error: 'Formato de resposta inválido' }
    }

    const extractedData = JSON.parse(jsonMatch[0])
    console.log('✅ JSON extraído com sucesso:', Object.keys(extractedData))
    
    // Validar dados obrigatórios
    const hasRecipient = extractedData.recebedor?.nome || extractedData.estabelecimento?.nome
    const hasAmount = extractedData.totais?.total_final
    
    if (!hasRecipient || !hasAmount) {
      console.log('❌ Dados obrigatórios não encontrados:', { hasRecipient: !!hasRecipient, hasAmount: !!hasAmount })
      return { success: false, error: 'Dados obrigatórios não encontrados (recebedor e valor)' }
    }

    return {
      success: true,
      data: extractedData,
      confidence: 0.95, // Confiança alta para GPT-4o
      source: 'openai'
    }

  } catch (error) {
    console.error('❌ Erro na extração OpenAI:', error)
    
    // Se for erro de quota, retornar erro específico
    if (error && typeof error === 'object' && 'code' in error && error.code === 'insufficient_quota') {
      return { success: false, error: 'Quota OpenAI excedida' }
    }
    
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      return { success: false, error: 'Quota OpenAI excedida' }
    }
    
    return { success: false, error: 'Erro na extração' }
  }
} 