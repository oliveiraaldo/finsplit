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
    console.log('📞 Telefone formatado para busca:', phone)
    
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { tenant: true }
    })

    // Se não encontrou, tentar várias estratégias de busca
    if (!user) {
      console.log('🔍 Primeira busca não encontrou, tentando estratégias alternativas...')
      
      // Estratégia 1: Extrair apenas os dígitos
      const phoneDigits = phone.replace(/\D/g, '')
      console.log('🔢 Dígitos extraídos:', phoneDigits)
      
      // Estratégia 2: Buscar com diferentes formatos possíveis
      const searchFormats = [
        phone, // Formato original
        `+${phoneDigits}`, // Com + na frente
        phoneDigits, // Só números
        phoneDigits.slice(-11), // Últimos 11 dígitos
        `+55${phoneDigits.slice(-11)}`, // Brasil específico
      ]
      
      console.log('📱 Formatos de busca:', searchFormats)
      
      for (const format of searchFormats) {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { phone: format },
              { phone: { contains: format.slice(-11) } } // Últimos 11 dígitos
            ]
          },
          include: { tenant: true }
        })
        
        if (users.length > 0) {
          user = users[0]
          console.log('✅ Usuário encontrado com formato:', format)
          console.log('👤 Dados do usuário:', { id: user.id, name: user.name, phone: user.phone })
          break
        }
      }
    }

    console.log('👤 Usuário encontrado:', user ? { id: user.id, name: user.name, phone: user.phone } : 'null')

    if (!user) {
      console.log('❌ USUÁRIO NÃO ENCONTRADO COM NENHUMA ESTRATÉGIA')
      console.log('🔍 Telefone original (from):', from)
      console.log('🔍 Telefone processado:', phone)
      
      // Debug completo: mostrar todos os usuários
      const allUsers = await prisma.user.findMany({
        select: { name: true, phone: true, email: true, createdAt: true }
      })
      
      console.log('📱 TODOS OS USUÁRIOS NO BANCO:')
      allUsers.forEach((u, index) => {
        console.log(`  ${index + 1}. ${u.name} (${u.email})`)
        console.log(`     📞 Telefone: "${u.phone}"`)
        console.log(`     📅 Cadastrado: ${u.createdAt}`)
        console.log('') // linha vazia
      })
      
      console.log('⚠️  POSSÍVEIS CAUSAS:')
      console.log('   1. Usuário não cadastrado (normal - enviar promocional)')
      console.log('   2. Telefone cadastrado em formato diferente')
      console.log('   3. Problema na formatação do WhatsApp')
      
      // Se o usuário parece brasileiro mas não foi encontrado, pode ser problema de formato
      const phoneDigits = phone.replace(/\D/g, '')
      if (phoneDigits.startsWith('55') && phoneDigits.length >= 12) {
        console.log('🇧🇷 Parece ser número brasileiro não cadastrado ou com problema de formato')
      }
      
      // Gerar mensagem promocional APENAS para usuários realmente novos
      console.log('📤 Enviando mensagem promocional para usuário não cadastrado')
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
    return await handleHelpCommand(from, user)

  } else if (text === 'saldo' || text.includes('saldo')) {
    return await handleBalanceCommand(from, user)

  } else if (text === 'grupos' || text.includes('grupos') || text.includes('grupo')) {
    return await handleGroupsCommand(from, user)

  } else if (text === 'lançamento' || text === 'lancamento' || text.includes('despesa')) {
    return await handleExpenseCommand(from, user)

  } else if (text === 'relatório' || text === 'relatorio' || text.includes('relatório')) {
    return await handleReportCommand(from, user)

  } else if (text === 'planos' || text.includes('plano')) {
    return await handlePlansCommand(from, user)

  } else if (text === 'planilha' || text === 'dashboard') {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`
    await sendWhatsAppMessage(from, `📊 Acesse seu dashboard: ${dashboardUrl}`)

  } else {
    // Mensagem mais humana para comando não reconhecido
    const helpMessage = `🤔 Não entendi sua mensagem.

Mas olha só o que você pode pedir aqui no WhatsApp:

1️⃣ *saldo* → ver seu saldo e débitos
2️⃣ *grupos* → listar ou criar grupos novos  
3️⃣ *lançamento* → registrar uma despesa manualmente
4️⃣ *relatório* → gerar resumo das suas despesas
5️⃣ *planos* → conhecer recursos e vantagens extras

Ou simplesmente envie um recibo e eu organizo os dados pra você ✨`

    await sendWhatsAppMessage(from, helpMessage)
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

// ===== COMANDOS DO WHATSAPP =====

async function handleHelpCommand(from: string, user: any) {
  const helpMessage = `🤖 *Menu de Comandos do FinSplit*

📱 *O que você pode fazer aqui:*

🔹 Envie um *recibo* (foto) → IA organiza automaticamente
🔹 Digite *saldo* → veja seus débitos e créditos  
🔹 Digite *grupos* → gerencie seus grupos
🔹 Digite *lançamento* → registre despesa manual
🔹 Digite *relatório* → resumo das suas finanças
🔹 Digite *planos* → veja recursos disponíveis

✅ *Para confirmar despesas:* "sim" ou "confirmar"
❌ *Para rejeitar:* "não" ou "rejeitar"

💡 *Dica:* Apenas envie a foto do recibo que eu cuido do resto!`

  await sendWhatsAppMessage(from, helpMessage)
  return NextResponse.json({ message: 'Help command processed' })
}

async function handleBalanceCommand(from: string, user: any) {
  try {
    // Buscar grupos do usuário
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            expenses: {
              include: {
                payments: true
              }
            }
          }
        }
      }
    })

    if (userGroups.length === 0) {
      await sendWhatsAppMessage(from, `💰 *Seu Saldo*

Você ainda não participa de nenhum grupo.

Digite *grupos* para criar ou entrar em um grupo! 📝`)
      return NextResponse.json({ message: 'Balance command - no groups' })
    }

    let totalOwed = 0
    let totalToPay = 0
    let balanceDetails = `💰 *Seu Saldo Geral*\n\n`

    userGroups.forEach(userGroup => {
      const group = userGroup.group
      let groupBalance = 0
      
      group.expenses.forEach(expense => {
        if (expense.paidById === user.id) {
          // Usuário pagou - deve receber
          const unpaidAmount = expense.payments
            .filter(p => p.status === 'PENDING')
            .reduce((sum, p) => sum + Number(p.amount), 0)
          groupBalance += unpaidAmount
        } else {
          // Usuário deve pagar
          const userPayment = expense.payments.find(p => p.userId === user.id)
          if (userPayment && userPayment.status === 'PENDING') {
            groupBalance -= Number(userPayment.amount)
          }
        }
      })

      if (groupBalance > 0) {
        totalOwed += groupBalance
        balanceDetails += `🟢 *${group.name}*: +R$ ${groupBalance.toFixed(2)}\n`
      } else if (groupBalance < 0) {
        totalToPay += Math.abs(groupBalance)
        balanceDetails += `🔴 *${group.name}*: -R$ ${Math.abs(groupBalance).toFixed(2)}\n`
      } else {
        balanceDetails += `⚪ *${group.name}*: Quitado\n`
      }
    })

    const netBalance = totalOwed - totalToPay
    balanceDetails += `\n📊 *Resumo:*\n`
    balanceDetails += `💚 A receber: R$ ${totalOwed.toFixed(2)}\n`
    balanceDetails += `❤️ A pagar: R$ ${totalToPay.toFixed(2)}\n`
    balanceDetails += `💰 Saldo líquido: ${netBalance >= 0 ? '+' : ''}R$ ${netBalance.toFixed(2)}`

    await sendWhatsAppMessage(from, balanceDetails)
    return NextResponse.json({ message: 'Balance command processed' })

  } catch (error) {
    console.error('Erro no comando saldo:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao buscar seu saldo. Tente novamente.')
    return NextResponse.json({ message: 'Balance command error' })
  }
}

async function handleGroupsCommand(from: string, user: any) {
  try {
    // Buscar grupos do usuário
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                expenses: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    if (userGroups.length === 0) {
      const message = `👥 *Seus Grupos*

Você ainda não participa de nenhum grupo.

🔗 *Para criar um grupo:*
Acesse: ${process.env.NEXTAUTH_URL}/dashboard/groups

Ou peça para alguém te adicionar em um grupo existente! 😊`

      await sendWhatsAppMessage(from, message)
      return NextResponse.json({ message: 'Groups command - no groups' })
    }

    let groupsMessage = `👥 *Seus Grupos* (${userGroups.length})\n\n`

    userGroups.forEach((userGroup, index) => {
      const group = userGroup.group
      const memberRole = userGroup.role === 'OWNER' ? '👑' : '👤'
      
      groupsMessage += `${index + 1}️⃣ ${memberRole} *${group.name}*\n`
      groupsMessage += `   • ${group._count.members} membros\n`
      groupsMessage += `   • ${group._count.expenses} despesas\n\n`
    })

    groupsMessage += `🔗 *Gerenciar grupos:*\n${process.env.NEXTAUTH_URL}/dashboard/groups`

    await sendWhatsAppMessage(from, groupsMessage)
    return NextResponse.json({ message: 'Groups command processed' })

  } catch (error) {
    console.error('Erro no comando grupos:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao buscar seus grupos. Tente novamente.')
    return NextResponse.json({ message: 'Groups command error' })
  }
}

async function handleExpenseCommand(from: string, user: any) {
  const message = `💸 *Registrar Despesa*

Para registrar uma despesa você pode:

📸 *Método 1 - Automático:*
Envie uma foto do recibo que a IA extrai os dados automaticamente!

✏️ *Método 2 - Manual:*
Acesse: ${process.env.NEXTAUTH_URL}/dashboard/expenses/new

🎯 *Dica:* O método automático é muito mais rápido - apenas tire a foto e envie! 📱`

  await sendWhatsAppMessage(from, message)
  return NextResponse.json({ message: 'Expense command processed' })
}

async function handleReportCommand(from: string, user: any) {
  try {
    // Buscar estatísticas básicas do usuário
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const expenses = await prisma.expense.findMany({
      where: {
        paidById: user.id,
        date: {
          gte: thisMonth
        },
        status: 'CONFIRMED'
      },
      include: {
        group: true,
        category: true
      }
    })

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)
    const groupCounts = expenses.reduce((acc, exp) => {
      acc[exp.group.name] = (acc[exp.group.name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topGroup = Object.entries(groupCounts).sort((a, b) => b[1] - a[1])[0]

    let reportMessage = `📊 *Relatório Rápido - ${thisMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}*\n\n`
    reportMessage += `💰 Total gasto: R$ ${totalExpenses.toFixed(2)}\n`
    reportMessage += `📈 Despesas registradas: ${expenses.length}\n\n`

    if (topGroup) {
      reportMessage += `🏆 Grupo mais ativo: *${topGroup[0]}* (${topGroup[1]} despesas)\n\n`
    }

    reportMessage += `📋 *Relatório completo:*\n${process.env.NEXTAUTH_URL}/dashboard/reports`

    await sendWhatsAppMessage(from, reportMessage)
    return NextResponse.json({ message: 'Report command processed' })

  } catch (error) {
    console.error('Erro no comando relatório:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao gerar relatório. Tente novamente.')
    return NextResponse.json({ message: 'Report command error' })
  }
}

async function handlePlansCommand(from: string, user: any) {
  try {
    // Buscar plano atual do usuário e planos disponíveis
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        customPlan: true
      }
    })

    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    })

    let plansMessage = `💎 *Planos FinSplit*\n\n`
    
    const currentPlanName = currentTenant?.customPlan 
      ? currentTenant.customPlan.name 
      : (currentTenant?.plan === 'FREE' ? 'Plano Gratuito' : 'Plano Premium')

    plansMessage += `🎯 *Seu plano atual:* ${currentPlanName}\n`
    plansMessage += `💳 Créditos: ${currentTenant?.credits || 0}\n`
    plansMessage += `📱 WhatsApp: ${currentTenant?.hasWhatsApp ? '✅' : '❌'}\n\n`

    plansMessage += `📋 *Planos disponíveis:*\n\n`

    plans.forEach(plan => {
      const price = plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}/mês`
      plansMessage += `🔹 *${plan.name}* - ${price}\n`
      if (plan.description) {
        plansMessage += `   ${plan.description}\n`
      }
      plansMessage += `   • ${plan.creditsIncluded} créditos\n`
      plansMessage += `   • ${plan.maxGroups} grupos\n`
      plansMessage += `   • WhatsApp: ${plan.hasWhatsApp ? '✅' : '❌'}\n\n`
    })

    plansMessage += `🛒 *Alterar plano:*\nEntre em contato com o suporte`

    await sendWhatsAppMessage(from, plansMessage)
    return NextResponse.json({ message: 'Plans command processed' })

  } catch (error) {
    console.error('Erro no comando planos:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao buscar planos. Tente novamente.')
    return NextResponse.json({ message: 'Plans command error' })
  }
}

// ===== FUNÇÕES DE UTILIDADE =====

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

 