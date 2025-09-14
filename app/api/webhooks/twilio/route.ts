import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/openai'
import { twilioClient } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook do Twilio recebido:', new Date().toISOString())
    
    const formData = await request.formData()
    const from = formData.get('From') as string
    const body = formData.get('Body') as string
    const mediaUrl = formData.get('MediaUrl0') as string
    const messageSid = formData.get('MessageSid') as string
    
    console.log('📱 Dados recebidos:', { from, body: body?.substring(0, 50), hasMedia: !!mediaUrl, messageSid })

    // Remover prefixo "whatsapp:" do número
    const phone = from.replace('whatsapp:', '')
    console.log('📞 Telefone processado:', phone)

    // Buscar usuário pelo telefone
    console.log('🔍 Buscando usuário no banco de dados...')
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { tenant: true }
    })

    // Se não encontrou, tentar busca flexível
    if (!user) {
      console.log('🔍 Tentando busca flexível...')
      
      // Extrair apenas os dígitos do telefone
      const phoneDigits = phone.replace(/\D/g, '')
      console.log('🔢 Dígitos extraídos:', phoneDigits)
      
      // Buscar por telefones que contenham esses dígitos
      const users = await prisma.user.findMany({
        where: {
          phone: {
            contains: phoneDigits.slice(-11) // Últimos 11 dígitos (DDD + número)
          }
        },
        include: { tenant: true }
      })
      
      if (users.length > 0) {
        user = users[0] // Pegar o primeiro encontrado
        console.log('✅ Usuário encontrado com busca flexível:', { id: user.id, name: user.name, phone: user.phone })
      }
    }

    console.log('👤 Usuário encontrado:', user ? { id: user.id, name: user.name, phone: user.phone } : 'null')

    if (!user) {
      console.log('❌ Usuário não encontrado, enviando mensagem promocional...')
      console.log('🔍 Telefone buscado:', phone)
      console.log('🔍 From original:', from)
      
      // Buscar todos os usuários para debug
      const allUsers = await prisma.user.findMany({
        select: { name: true, phone: true, email: true }
      })
      
      console.log('📱 Todos os usuários no banco:')
      allUsers.forEach(u => {
        console.log(`  - ${u.name}: "${u.phone}" (${u.email})`)
      })
      
      // Gerar mensagem promocional com planos disponíveis
      const promotionalMessage = await generatePromotionalMessage()
      await sendWhatsAppMessage(from, promotionalMessage)
      return NextResponse.json({ message: 'Usuário não encontrado - mensagem promocional enviada' })
    }

    // Verificar se o tenant tem WhatsApp habilitado
    console.log('🏢 Verificando plano WhatsApp:', { hasWhatsApp: user.tenant.hasWhatsApp, credits: user.tenant.credits })
    
    if (!user.tenant.hasWhatsApp) {
      console.log('❌ WhatsApp não habilitado para este tenant')
      await sendWhatsAppMessage(from, 'Seu plano atual não inclui integração com WhatsApp. Faça upgrade para Premium.')
      return NextResponse.json({ message: 'WhatsApp não habilitado' })
    }

    // Verificar se tem créditos
    if (user.tenant.credits <= 0) {
      console.log('❌ Sem créditos suficientes:', user.tenant.credits)
      await sendWhatsAppMessage(from, 'Você não tem créditos suficientes. Entre em contato com o suporte.')
      return NextResponse.json({ message: 'Sem créditos' })
    }

    // Se recebeu uma imagem/documento (recibo)
    if (mediaUrl) {
      return await handleReceiptUpload(from, mediaUrl, user, messageSid)
    }

    // Se recebeu texto
    if (body) {
      return await handleTextMessage(from, body, user)
    }

    return NextResponse.json({ message: 'Mensagem processada' })

  } catch (error) {
    console.error('Erro no webhook do Twilio:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function handleReceiptUpload(from: string, mediaUrl: string, user: any, messageSid: string) {
  try {
    console.log('📥 Processando imagem do recibo...')
    console.log('🔗 URL da mídia:', mediaUrl)
    console.log('👤 Usuário:', user.id, user.name)
    console.log('🏢 Tenant:', user.tenant.id, user.tenant.name)
    
    // Baixar a mídia com autenticação Twilio
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
    
    const mediaBuffer = await mediaResponse.arrayBuffer()
    
    // Verificar headers da resposta
    const contentType = mediaResponse.headers.get('content-type')
    const contentLength = mediaResponse.headers.get('content-length')
    console.log('📋 Headers da mídia:')
    console.log('  - Content-Type:', contentType)
    console.log('  - Content-Length:', contentLength)
    console.log('  - Buffer size:', mediaBuffer.byteLength)
    
    // Verificar se é realmente uma imagem
    if (!contentType || !contentType.startsWith('image/')) {
      console.log('❌ Não é uma imagem válida. Content-Type:', contentType)
      console.log('📄 Conteúdo recebido (primeiros 200 chars):', Buffer.from(mediaBuffer).toString('utf8').substring(0, 200))
      throw new Error(`Formato inválido: ${contentType}. Esperado: image/*`)
    }
    
    if (mediaBuffer.byteLength < 1000) {
      throw new Error(`Imagem muito pequena: ${mediaBuffer.byteLength} bytes. Mínimo esperado: 1000 bytes`)
    }
  
    // Converter para base64
    const base64Media = Buffer.from(mediaBuffer).toString('base64')
    console.log('📊 Base64 gerado:', base64Media.substring(0, 100) + '...')

    // Extrair dados com OpenAI
    let extractionResult = await extractReceiptData(base64Media)

    // Se falhar na OpenAI, informar erro específico
    if (!extractionResult.success) {
      console.log('❌ OpenAI falhou:', extractionResult.error)
      
      let errorMessage = 'Erro ao processar o recibo. '
      const error = extractionResult.error || 'Erro desconhecido'
      
      if (error.includes('unsupported image')) {
        errorMessage += 'Formato de imagem não suportado. Use PNG, JPEG, GIF ou WebP.'
      } else if (error.includes('quota')) {
        errorMessage += 'Quota OpenAI excedida. Tente novamente mais tarde.'
      } else {
        errorMessage += 'Tente enviar uma imagem mais clara ou em formato diferente.'
      }
      
      await sendWhatsAppMessage(from, errorMessage)
      return NextResponse.json({ message: 'Falha na extração: ' + extractionResult.error })
    }

    // Validar campos obrigatórios
    const validation = validateRequiredFields(extractionResult.data)
    if (!validation.isValid) {
      const missingFields = validation.missing.map(field => {
        const fieldNames = {
          recebedor: 'Recebedor/Estabelecimento',
          data: 'Data',
          valor: 'Valor',
          categoria: 'Categoria'
        }
        return fieldNames[field as keyof typeof fieldNames] || field
      }).join(', ')

      const message = `❌ Dados obrigatórios não identificados:\n\n` +
        `Campos faltando: ${missingFields}\n\n` +
        `Por favor, envie uma imagem mais clara ou informe os dados manualmente:\n` +
        `"recebedor: [nome do recebedor/estabelecimento]"\n` +
        `"data: [data no formato DD/MM/AAAA]"\n` +
        `"valor: [valor total]"\n` +
        `"categoria: [categoria da despesa]"`

      await sendWhatsAppMessage(from, message)
      return NextResponse.json({ message: 'Campos obrigatórios não identificados' })
    }

    // Verificar duplicatas
    const duplicate = await checkDuplicateExpense(user.id, extractionResult.data)
    if (duplicate) {
      const duplicateMessage = `⚠️ ATENÇÃO: Despesa similar já cadastrada!\n\n` +
        `📋 Dados existentes:\n` +
        `🏪 Local: ${duplicate.description}\n` +
        `💰 Valor: R$ ${duplicate.amount}\n` +
        `📅 Data: ${duplicate.date.toLocaleDateString('pt-BR')}\n` +
        `📊 Status: ${duplicate.status === 'CONFIRMED' ? 'Confirmada' : 'Pendente'}\n\n` +
        `Deseja cadastrar mesmo assim?\n` +
        `Responda "sim" para confirmar ou "não" para cancelar.`

      await sendWhatsAppMessage(from, duplicateMessage)
      
      // Salvar despesa como pendente para confirmação
      const expense = await prisma.expense.create({
        data: {
          description: extractionResult.data.recebedor?.nome || extractionResult.data.estabelecimento?.nome || extractionResult.data.merchant,
          amount: extractionResult.data.totais?.total_final || extractionResult.data.amount,
          date: extractionResult.data.datas?.emissao ? new Date(extractionResult.data.datas.emissao) : new Date(extractionResult.data.date),
          status: 'PENDING',
          receiptUrl: mediaUrl,
          receiptData: extractionResult.data,
          aiExtracted: true,
          aiConfidence: extractionResult.confidence,
          paidBy: {
            connect: { id: user.id }
          },
          group: {
            connect: { id: (await getOrCreateDefaultGroup(user.tenantId, user.id)).id }
          },
          categoryId: undefined
        }
      })

      return NextResponse.json({ message: 'Despesa duplicada detectada, aguardando confirmação' })
    }

    console.log('💾 Criando despesa no banco...')
    
    // Criar despesa pendente
    const expense = await prisma.expense.create({
      data: {
        description: extractionResult.data.recebedor?.nome || extractionResult.data.estabelecimento?.nome || extractionResult.data.description || 'Recibo enviado via WhatsApp',
        amount: extractionResult.data.totais?.total_final || extractionResult.data.amount || 0,
        date: extractionResult.data.datas?.emissao ? new Date(extractionResult.data.datas.emissao) : new Date(),
        status: 'PENDING',
        receiptUrl: mediaUrl,
        receiptData: extractionResult.data,
        aiExtracted: true,
        aiConfidence: extractionResult.confidence,
        paidBy: {
          connect: { id: user.id }
        },
        group: {
          connect: { id: (await getOrCreateDefaultGroup(user.tenantId, user.id)).id }
        },
        categoryId: undefined
      }
    })
    
    console.log('✅ Despesa criada com sucesso:', expense.id)

    // Consumir crédito
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { credits: { decrement: 1 } }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'RECEIPT_UPLOAD_WHATSAPP',
        entity: 'EXPENSE',
        entityId: expense.id,
        details: { mediaUrl, messageSid, aiConfidence: extractionResult.confidence },
        tenantId: user.tenantId,
        userId: user.id
      }
    })

    console.log('📋 Buscando grupos do usuário...')
    
    // Buscar grupos do usuário para seleção
    const userGroups = await getUserGroups(user.id, user.tenantId)
    console.log('📋 Grupos encontrados:', userGroups.length)
    
    // Enviar confirmação com seleção de grupo
    let message = `✅ Recibo recebido!\n\n` +
      `👤 Recebedor: ${extractionResult.data.recebedor?.nome || extractionResult.data.estabelecimento?.nome || 'Não identificado'}\n` +
      `💰 Valor: R$ ${extractionResult.data.totais?.total_final || extractionResult.data.amount || 0}\n` +
      `📅 Data: ${extractionResult.data.datas?.emissao || extractionResult.data.date || 'Não identificada'}\n` +
      `📄 Tipo: ${extractionResult.data.documento?.tipo || extractionResult.data.tipo_transacao || 'Recibo'}\n\n`

    // Sempre mostrar grupos pré-definidos + opção de criar novo
    message += `📋 Selecione o grupo de despesas:\n`
    message += `1. Alimentação 🍽️\n`
    message += `2. Transporte 🚗\n`
    message += `3. Lazer 🎮\n`
    message += `4. Moradia 🏠\n`
    
    if (userGroups.length > 0) {
      message += `5. Meus grupos:\n`
      userGroups.forEach((group, index) => {
        message += `   ${index + 6}. ${group.name}\n`
      })
    }
    
    message += `0. Criar novo grupo\n\n`
    message += `Responda com o número do grupo ou "0" para novo grupo.`
    
    // Definir estado do usuário para aguardar seleção de grupo
    const predefinedGroups = [
      { id: 'alimentacao', name: 'Alimentação', description: 'Despesas com comida, restaurantes, mercado' },
      { id: 'transporte', name: 'Transporte', description: 'Uber, táxi, combustível, passagens' },
      { id: 'lazer', name: 'Lazer', description: 'Entretenimento, cinema, shows, viagens' },
      { id: 'moradia', name: 'Moradia', description: 'Aluguel, contas, manutenção' }
    ]
    
    await setUserState(user.id, { 
      action: 'SELECTING_GROUP', 
      groups: [...predefinedGroups, ...userGroups],
      predefinedGroups: predefinedGroups,
      userGroups: userGroups,
      pendingExpenseData: {
        description: extractionResult.data.recebedor?.nome || extractionResult.data.estabelecimento?.nome,
        amount: extractionResult.data.totais?.total_final || extractionResult.data.amount,
        date: extractionResult.data.datas?.emissao ? new Date(extractionResult.data.datas.emissao) : new Date(),
        receiptData: extractionResult.data,
        mediaUrl: mediaUrl
      }
    })

        console.log('📤 Enviando mensagem final...')
    console.log('📝 Conteúdo da mensagem:', message)
    
    await sendWhatsAppMessage(from, message)
    
    console.log('✅ Processamento do recibo concluído com sucesso!')
    return NextResponse.json({ message: 'Recibo processado com sucesso' })

  } catch (error) {
    console.error('Erro ao processar recibo:', error)
    await sendWhatsAppMessage(from, 'Erro ao processar o recibo. Tente novamente.')
    return NextResponse.json({ message: 'Erro ao processar recibo' })
  }
}

async function handleTextMessage(from: string, body: string, user: any) {
  const text = body.toLowerCase().trim()
  
  console.log('📱 Processando mensagem de texto:', text)
  console.log('👤 Usuário:', user.id, user.name)

  // Verificar se o usuário está em processo de seleção de grupo
  const userState = await getUserState(user.id)
  console.log('🔍 Estado atual do usuário:', userState)
  
  if (userState && userState.action === 'SELECTING_GROUP') {
    console.log('📋 Usuário selecionando grupo...')
    return await handleGroupSelection(from, text, user, userState)
  }

  if (text === 'sim' || text === 'yes' || text === 'confirmar') {
    console.log('✅ Usuário confirmando despesa...')
    // Verificar se o usuário está aguardando confirmação com grupo selecionado
    const currentUserState = await getUserState(user.id)
    
    if (currentUserState && currentUserState.action === 'WAITING_CONFIRMATION') {
              console.log('🎯 Criando despesa no grupo:', currentUserState.groupId)
        console.log('📊 Dados da despesa:', currentUserState.pendingExpenseData)
        
        // Criar despesa no grupo selecionado
        const expense = await prisma.expense.create({
          data: {
            description: currentUserState.pendingExpenseData.description,
            amount: currentUserState.pendingExpenseData.amount,
            date: currentUserState.pendingExpenseData.date,
            status: 'CONFIRMED',
            receiptUrl: currentUserState.pendingExpenseData.mediaUrl,
            receiptData: currentUserState.pendingExpenseData.receiptData,
            aiExtracted: true,
            aiConfidence: 0.95,
            paidBy: {
              connect: { id: user.id }
            },
            group: {
              connect: { id: currentUserState.groupId }
            },
            categoryId: undefined
          }
        })
        
        console.log('✅ Despesa criada com sucesso:', expense.id)

        // Log de auditoria
        await prisma.auditLog.create({
          data: {
            action: 'EXPENSE_CONFIRMED_WHATSAPP',
            entity: 'EXPENSE',
            entityId: expense.id,
            details: { confirmedVia: 'whatsapp', groupId: currentUserState.groupId },
            tenantId: user.tenantId,
            userId: user.id
          }
        })

        // Enviar link da planilha
        const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/groups/${currentUserState.groupId}`
        await sendWhatsAppMessage(from, `✅ Despesa confirmada no grupo!\n\n📊 Veja na planilha: ${dashboardUrl}`)
        
        // Limpar estado do usuário
        await setUserState(user.id, null)
      
    } else {
      // Confirmar despesa pendente (comportamento antigo)
      const pendingExpense = await prisma.expense.findFirst({
        where: {
          paidById: user.id,
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (pendingExpense) {
        await prisma.expense.update({
          where: { id: pendingExpense.id },
          data: { status: 'CONFIRMED' }
        })

        // Log de auditoria
        await prisma.auditLog.create({
          data: {
            action: 'EXPENSE_CONFIRMED_WHATSAPP',
            entity: 'EXPENSE',
            entityId: pendingExpense.id,
            details: { confirmedVia: 'whatsapp' },
            tenantId: user.tenantId,
            userId: user.id
          }
        })

        // Enviar link da planilha
        const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard/groups/${pendingExpense.groupId}`
        await sendWhatsAppMessage(from, `✅ Despesa confirmada!\n\n📊 Veja na planilha: ${dashboardUrl}`)

      } else {
        await sendWhatsAppMessage(from, 'Não há despesas pendentes para confirmar.')
      }
    }

  } else if (text === 'não' || text === 'no' || text === 'rejeitar') {
    // Rejeitar despesa pendente
    const pendingExpense = await prisma.expense.findFirst({
      where: {
        paidById: user.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    if (pendingExpense) {
      await prisma.expense.update({
        where: { id: pendingExpense.id },
        data: { status: 'REJECTED' }
      })

      await sendWhatsAppMessage(from, '❌ Despesa rejeitada. Envie um novo recibo se necessário.')
    }

  } else if (text === 'ajuda' || text === 'help' || text === 'menu') {
    const helpMessage = `🤖 FinSplit WhatsApp Bot\n\n` +
      `📸 Envie uma foto do recibo para registrar uma despesa\n` +
      `✅ Responda "sim" para confirmar despesas\n` +
      `❌ Responda "não" para rejeitar despesas\n` +
      `📊 Digite "planilha" para ver o link da planilha\n` +
      `❓ Digite "ajuda" para ver este menu`

    await sendWhatsAppMessage(from, helpMessage)

  } else if (text === 'planilha' || text === 'dashboard') {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`
    await sendWhatsAppMessage(from, `📊 Acesse seu dashboard: ${dashboardUrl}`)

  } else {
    await sendWhatsAppMessage(from, 'Não entendi. Digite "ajuda" para ver as opções disponíveis.')
  }

  return NextResponse.json({ message: 'Mensagem processada' })
}

async function extractReceiptData(base64Image: string) {
  try {
    console.log('🤖 Tentando extração com OpenAI...')
    console.log('📊 Tamanho da imagem (base64):', base64Image.length)
    console.log('🔑 OpenAI API Key configurada:', !!process.env.OPENAI_API_KEY)
    
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
        
        Responda APENAS com o JSON válido, sem texto adicional.
      `

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
                url: `data:image/jpeg;base64,${base64Image}`
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
      confidence: 0.95,
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

// Função para gerar mensagem promocional dinâmica
async function generatePromotionalMessage(): Promise<string> {
  try {
    // Buscar planos disponíveis do banco de dados
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      select: {
        name: true,
        price: true,
        description: true
      }
    })

    // URL de cadastro (ajuste conforme sua URL de produção)
    const signupUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/signup` : 'https://finsplit.app/auth/signup'

    let message = `Olá! 👋 Não encontramos seu cadastro no FinSplit.

Para começar a usar o FinSplit é bem simples:

🔗 Clique aqui para se cadastrar agora: ${signupUrl}

🚀 Com o FinSplit você poderá:

✅ Organizar despesas pessoais e da sua família – controle de mercado, contas fixas, viagens, lazer e mais
✅ Gerenciar as finanças da sua empresa ou equipe – com relatórios, categorias de custos e divisão entre sócios/colaboradores  
✅ Criar múltiplos grupos de custo – família, viagem com amigos, empresa, eventos, projetos
✅ Dividir gastos entre usuários – cada pessoa vê quanto deve pagar ou receber
✅ Relatórios claros e práticos – saiba quem já pagou e acompanhe tudo em tempo real
✅ Controle simplificado – centralize informações sem precisar de planilhas complicadas

💡 Planos disponíveis:\n`

    // Adicionar planos dinamicamente
    plans.forEach(plan => {
      const planPrice = plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}/mês`
      const planDescription = plan.description || ''
      message += `\n${plan.name} – ${planPrice}`
      if (planDescription) {
        message += ` – ${planDescription}`
      }
    })

    message += `\n\n👉 Cadastre-se agora mesmo e comece a simplificar suas finanças!

${signupUrl}`

    console.log('📝 Mensagem promocional gerada:', message.length, 'caracteres')
    return message

  } catch (error) {
    console.error('❌ Erro ao gerar mensagem promocional:', error)
    // Fallback para mensagem estática caso falhe
    return `Olá! 👋 Não encontramos seu cadastro no FinSplit.

Para começar a usar o FinSplit é bem simples:

🔗 Cadastre-se agora: ${process.env.NEXT_PUBLIC_APP_URL || 'https://finsplit.app'}/auth/signup

🚀 Organize suas despesas, divida gastos e tenha controle total das suas finanças!

👉 Cadastre-se agora mesmo e comece a simplificar suas finanças!`
  }
}

async function sendWhatsAppMessage(to: string, body: string) {
  try {
    console.log('📱 Preparando envio de mensagem WhatsApp...')
    console.log('🔑 Twilio configurado:', !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN && !!process.env.TWILIO_PHONE_NUMBER)
    
    // Formatar número para WhatsApp
    const formattedFrom = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    
    console.log('📱 Enviando mensagem WhatsApp:')
    console.log('  From:', formattedFrom)
    console.log('  To:', formattedTo)
    console.log('  Body preview:', body.substring(0, 100) + '...')
    
    await twilioClient.messages.create({
      body,
      from: formattedFrom,
      to: formattedTo
    })
    
    console.log('✅ Mensagem WhatsApp enviada com sucesso')
  } catch (error: any) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error)
    console.error('  Detalhes:', error.message)
    console.error('  Código:', error.code)
  }
}

// Função para criar ou obter grupo padrão
// Função para verificar duplicatas
async function checkDuplicateExpense(userId: string, data: any) {
  try {
    const duplicate = await prisma.expense.findFirst({
      where: {
        paidById: userId,
        amount: data.totais?.total_final || data.amount,
        description: data.recebedor?.nome || data.estabelecimento?.nome || data.merchant,
        date: data.datas?.emissao ? new Date(data.datas.emissao) : new Date(data.date),
        status: { in: ['CONFIRMED', 'PENDING'] }
      }
    })

    return duplicate
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas:', error)
    return null
  }
}

// Função para validar campos obrigatórios
function validateRequiredFields(data: any) {
  const required = {
    recebedor: data.recebedor?.nome || data.estabelecimento?.nome || data.merchant,
    data: data.datas?.emissao || data.date,
    valor: data.totais?.total_final || data.amount,
    pagador: true, // Sempre disponível (usuário atual)
    categoria: data.category || data.tipo_transacao
  }

  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  return {
    isValid: missing.length === 0,
    missing,
    data: required
  }
}

// Função para gerenciar estado do usuário
async function getUserState(userId: string) {
  try {
    // Por enquanto, vamos usar uma abordagem simples com cache em memória
    // Em produção, isso deveria ser armazenado no banco de dados
    return (global as any).userStates?.[userId] || null
  } catch (error) {
    console.error('❌ Erro ao buscar estado do usuário:', error)
    return null
  }
}

async function setUserState(userId: string, state: any) {
  try {
    if (!(global as any).userStates) {
      (global as any).userStates = {}
    }
    (global as any).userStates[userId] = state
    return true
  } catch (error) {
    console.error('❌ Erro ao definir estado do usuário:', error)
    return false
  }
}

// Função para processar seleção de grupo
async function handleGroupSelection(from: string, text: string, user: any, userState: any) {
  try {
    const selection = parseInt(text)
    
    if (isNaN(selection)) {
      await sendWhatsAppMessage(from, '❌ Por favor, digite apenas o número do grupo (1, 2, 3...) ou "0" para novo grupo.')
      return NextResponse.json({ message: 'Seleção inválida' })
    }

    if (selection === 0) {
      // Criar novo grupo
      const newGroup = await prisma.group.create({
        data: {
          name: `Grupo ${new Date().toLocaleDateString('pt-BR')}`,
          description: 'Grupo criado via WhatsApp',
          tenantId: user.tenantId,
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN'
            }
          }
        }
      })

      await sendWhatsAppMessage(from, `✅ Novo grupo criado: "${newGroup.name}"\n\nAgora responda "sim" para confirmar a despesa neste grupo.`)
      
      // Atualizar estado do usuário para aguardar confirmação
      await setUserState(user.id, { action: 'WAITING_CONFIRMATION', groupId: newGroup.id })
      
    } else if (selection > 0 && selection <= userState.groups.length) {
      // Selecionar grupo (pré-definido ou personalizado)
      const selectedGroup = userState.groups[selection - 1]
      
      console.log('🎯 Grupo selecionado:', selectedGroup.name, 'ID:', selectedGroup.id)
      
      // Se for grupo pré-definido, criar ou encontrar o grupo real
      let actualGroupId = selectedGroup.id
      
      if (selection <= 4) {
        // Grupo pré-definido - criar se não existir
        let actualGroup = await prisma.group.findFirst({
          where: {
            name: selectedGroup.name,
            tenantId: user.tenantId
          }
        })
        
        if (!actualGroup) {
          actualGroup = await prisma.group.create({
            data: {
              name: selectedGroup.name,
              description: selectedGroup.description,
              tenantId: user.tenantId,
              members: {
                create: {
                  userId: user.id,
                  role: 'ADMIN'
                }
              }
            }
          })
          console.log('✅ Grupo pré-definido criado:', actualGroup.name)
        }
        
        actualGroupId = actualGroup.id
      }
      
      await sendWhatsAppMessage(from, `✅ Grupo selecionado: "${selectedGroup.name}"\n\nAgora responda "sim" para confirmar a despesa neste grupo.`)
      
      // Atualizar estado do usuário para aguardar confirmação
      const newState = { 
        action: 'WAITING_CONFIRMATION', 
        groupId: actualGroupId,
        pendingExpenseData: userState.pendingExpenseData // Manter dados da despesa
      }
      
      console.log('🔄 Definindo novo estado:', newState)
      await setUserState(user.id, newState)
      
      console.log('✅ Estado atualizado, aguardando confirmação...')
      
    } else {
      await sendWhatsAppMessage(from, `❌ Número inválido. Digite um número entre 1 e ${userState.groups.length}, ou "0" para novo grupo.`)
    }

    return NextResponse.json({ message: 'Seleção de grupo processada' })
    
  } catch (error) {
    console.error('❌ Erro ao processar seleção de grupo:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao processar seleção. Digite "ajuda" para ver as opções.')
    return NextResponse.json({ message: 'Erro ao processar seleção' })
  }
}

// Função para listar grupos do usuário
async function getUserGroups(userId: string, tenantId: string) {
  try {
    const groups = await prisma.group.findMany({
      where: {
        tenantId,
        members: {
          some: { userId }
        }
      },
      select: {
        id: true,
        name: true,
        description: true
      }
    })

    return groups
  } catch (error) {
    console.error('❌ Erro ao buscar grupos:', error)
    return []
  }
}

async function getOrCreateDefaultGroup(tenantId: string, userId: string) {
  try {
    // Tentar encontrar um grupo existente
    let group = await prisma.group.findFirst({
      where: { tenantId }
    })

    // Se não existir, criar um grupo padrão
    if (!group) {
      group = await prisma.group.create({
        data: {
          name: 'Despesas Gerais',
          description: 'Grupo padrão para despesas via WhatsApp',
          tenantId,
          members: {
            create: {
              userId,
              role: 'ADMIN'
            }
          }
        }
      })
      console.log('✅ Grupo padrão criado:', group.name, 'com usuário:', userId)
    } else {
      // Verificar se o usuário já é membro
      const existingMember = await prisma.groupMember.findFirst({
        where: {
          groupId: group.id,
          userId
        }
      })

      // Se não for membro, adicionar
      if (!existingMember) {
        await prisma.groupMember.create({
          data: {
            groupId: group.id,
            userId,
            role: 'MEMBER'
          }
        })
        console.log('✅ Usuário adicionado ao grupo:', userId)
      }
    }

    return group
  } catch (error) {
    console.error('❌ Erro ao criar/obter grupo padrão:', error)
    throw error
  }
}

 