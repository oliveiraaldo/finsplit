import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOnboardingToken, validateOnboardingToken, extractTokenFromMessage, generateReturnMessage } from '@/lib/onboarding-token'
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

    // Ignorar mensagens do próprio número Twilio (evita loop)
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER?.replace('whatsapp:', '').replace('+', '').replace(/\D/g, '')
    const phoneDigitsOnly = phone.replace(/\D/g, '')
    if (twilioNumber && phoneDigitsOnly === twilioNumber) {
      console.log('⚠️ Mensagem do próprio número Twilio detectada - ignorando para evitar loop')
      return NextResponse.json({ message: 'Mensagem do próprio Twilio ignorada' })
    }

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
      
      // Estratégia 2: Normalização para números brasileiros (adicionar nono dígito se necessário)
      let brazilianVariants: string[] = []
      if (phoneDigits.startsWith('55')) {
        const ddd = phoneDigits.substring(2, 4) // Extrai o DDD (2 dígitos após 55)
        const resto = phoneDigits.substring(4) // O resto do número
        
        console.log('🇧🇷 Número brasileiro detectado - DDD:', ddd, '| Resto:', resto, `(${resto.length} dígitos)`)
        
        // Celulares brasileiros devem ter 9 dígitos após o DDD
        // Se tem 8 dígitos, falta o nono dígito obrigatório
        if (resto.length === 8) {
          const withNinthDigit = `+55${ddd}9${resto}`
          brazilianVariants.push(withNinthDigit)
          console.log('📱 Variante com 9º dígito adicionado:', withNinthDigit)
        }
        
        // Se tem 9 dígitos, pode tentar remover o primeiro (caso seja o 9º dígito)
        if (resto.length === 9 && resto.startsWith('9')) {
          const withoutNinthDigit = `+55${ddd}${resto.substring(1)}`
          brazilianVariants.push(withoutNinthDigit)
          console.log('📱 Variante sem 9º dígito (teste):', withoutNinthDigit)
        }
      }
      
      // Estratégia 3: Buscar com diferentes formatos possíveis
      const searchFormats = [
        phone, // Formato original
        `+${phoneDigits}`, // Com + na frente
        phoneDigits, // Só números
        phoneDigits.slice(-11), // Últimos 11 dígitos
        `+55${phoneDigits.slice(-11)}`, // Brasil específico
        ...brazilianVariants // Variantes brasileiras com/sem nono dígito
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
      console.log('❌ USUÁRIO NÃO ENCONTRADO')
      console.log('📞 Telefone:', phone)
      
      // Verificar se a mensagem contém token de retorno do onboarding
      if (body && body.toLowerCase().includes('voltei do cadastro')) {
        console.log('🔄 RETORNO DO ONBOARDING DETECTADO')
        return await handleOnboardingReturn(from, body)
      }
      
      // Verificar se usuário digitou "onboarding" para iniciar cadastro guiado
      if (body && body.toLowerCase().includes('onboarding')) {
        console.log('🚀 ONBOARDING SOLICITADO PELO USUÁRIO')
        return await handleNewUserOnboarding(from, phone)
      }
      
      // Caso contrário, enviar mensagem promocional normal
      console.log('📤 Enviando mensagem promocional padrão')
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
      // Verificar se usuário existente quer refazer onboarding
      if (body.toLowerCase().includes('onboarding')) {
        console.log('🔄 USUÁRIO EXISTENTE SOLICITOU ONBOARDING')
        return await handleExistingUserOnboarding(from, user)
      }
      
      // Nota: Confirmações de recibo agora são tratadas pelo sistema de estados em handleTextMessage
      
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
    
    // Verificar se é um tipo de arquivo aceito (imagens e PDFs)
    const isImage = contentType && contentType.startsWith('image/')
    const isPdf = contentType && contentType.includes('pdf')
    const isAcceptedType = isImage || isPdf
    
    if (!contentType || !isAcceptedType) {
      console.log('❌ Tipo de arquivo não aceito. Content-Type:', contentType)
      console.log('📄 Tipos aceitos: image/* ou application/pdf')
      throw new Error(`Formato inválido: ${contentType}. Esperado: image/* ou PDF`)
    }
    
    console.log('✅ Tipo detectado:', isImage ? 'Imagem' : 'PDF')
    
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
      
      // Determinar tipos de mídia e documento
      const contentType = await getMediaContentType(mediaUrl)
      const isImage = contentType?.startsWith('image/')
      const isPdf = contentType?.includes('pdf')
      
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
          mediaType: contentType || 'application/octet-stream',
          documentType: isImage ? 'recibo' : isPdf ? 'nota_fiscal' : 'comprovante',
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

    console.log('💾 Processando dados extraídos da IA...')
    
    // Extrair e normalizar dados
    const extractedData = {
      recebedor: extractionResult.data.recebedor?.nome || extractionResult.data.estabelecimento?.nome || 'Não identificado',
      valor: extractionResult.data.totais?.total_final || extractionResult.data.amount || 0,
      data: extractionResult.data.datas?.emissao || extractionResult.data.date || new Date().toISOString().split('T')[0],
      tipo: extractionResult.data.documento?.tipo || extractionResult.data.tipo_transacao || 'Recibo'
    }

    // Formatação da data para exibição
    let dataFormatada = 'Não identificada'
    try {
      const dataObj = new Date(extractedData.data)
      if (!isNaN(dataObj.getTime())) {
        dataFormatada = dataObj.toLocaleDateString('pt-BR')
      }
    } catch (error) {
      console.log('Erro ao formatar data:', error)
    }

    // Consumir crédito
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: { credits: { decrement: 1 } }
    })

    // Mostrar resumo para confirmação
    const message = `✅ Recibo recebido!

👤 Recebedor: ${extractedData.recebedor}
💰 Valor: R$ ${typeof extractedData.valor === 'number' ? extractedData.valor.toFixed(2).replace('.', ',') : extractedData.valor}
📅 Data: ${dataFormatada}
📄 Tipo: ${extractedData.tipo}

Estes dados estão corretos?
1 Confirmar · 2 Corrigir`
    
    // Definir estado do usuário para aguardar confirmação
    await setUserState(user.id, { 
      action: 'RECEIPT_CONFIRMATION',
      extractedData: extractedData,
      originalData: extractionResult.data,
      mediaUrl: mediaUrl,
      confidence: extractionResult.confidence
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
  
  // Novo fluxo de confirmação de recibo
  if (userState && userState.action === 'RECEIPT_CONFIRMATION') {
    console.log('✅ Usuário confirmando/corrigindo recibo...')
    return await handleReceiptConfirmationChoice(from, text, user, userState)
  }

  if (userState && userState.action === 'RECEIPT_EDITING') {
    console.log('✏️ Usuário escolhendo o que corrigir...')
    return await handleReceiptEditingMenu(from, text, user, userState)
  }

  if (userState && userState.action === 'RECEIPT_EDITING_FIELD') {
    console.log('📝 Usuário editando campo...')
    return await handleReceiptFieldEdit(from, text, user, userState)
  }

  if (userState && userState.action === 'GROUP_SELECTION') {
    console.log('📋 Usuário selecionando grupo...')
    return await handleGroupSelection(from, text, user, userState)
  }

  if (userState && userState.action === 'GROUP_CREATION') {
    console.log('🏗️ Usuário criando novo grupo...')
    return await handleNewGroupCreation(from, text, user, userState)
  }

  if (userState && userState.action === 'FINAL_CONFIRMATION') {
    console.log('🔎 Usuário na confirmação final...')
    return await handleFinalConfirmation(from, text, user, userState)
  }

  // Estados legados (manter compatibilidade)
  if (userState && userState.action === 'SELECTING_GROUP') {
    console.log('📋 Usuário selecionando grupo (modo legado)...')
    return await handleGroupSelection(from, text, user, userState)
  }

  if (userState && userState.action === 'NEEDS_GROUP_CREATION') {
    console.log('🆕 Usuário precisa criar grupo...')
    if (text.toLowerCase().includes('criar grupo')) {
      return await handleCreateFirstGroup(from, user, userState)
    } else {
      await sendWhatsAppMessage(from, '💡 Para continuar com seu recibo, você precisa criar um grupo primeiro.\n\nDigite *"criar grupo"* para começar.')
      return NextResponse.json({ message: 'Aguardando criação de grupo' })
    }
  }

  if (userState && userState.action === 'CREATING_FIRST_GROUP') {
    console.log('🏗️ Usuário criando primeiro grupo...')
    return await handleGroupCreation(from, text, user, userState)
  }

  if (userState && userState.action === 'TYPING_GROUP_NAME') {
    console.log('✍️ Usuário digitando nome personalizado...')
    return await handleGroupCreation(from, text, user, userState)
  }

  if (text.toLowerCase() === 'sim' || text.toLowerCase() === 'yes' || text.toLowerCase() === 'confirmar') {
    console.log('✅ Usuário confirmando despesa...')
    // Verificar se o usuário está aguardando confirmação com grupo selecionado
    const currentUserState = await getUserState(user.id)
    
    if (currentUserState && currentUserState.action === 'WAITING_CONFIRMATION') {
        console.log('🎯 Confirmando despesa no grupo:', currentUserState.groupId)
        console.log('📊 Atualizando despesa ID:', currentUserState.pendingExpenseId)
        
        // Atualizar despesa existente ao invés de criar nova
        const expense = await prisma.expense.update({
          where: { id: currentUserState.pendingExpenseId },
          data: {
            status: 'CONFIRMED',
            groupId: currentUserState.groupId // Mover para o grupo selecionado
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

async function getMediaContentType(mediaUrl: string): Promise<string | null> {
  try {
    console.log('🔍 Buscando Content-Type da mídia:', mediaUrl)
    
    const response = await fetch(mediaUrl, {
      method: 'HEAD', // Apenas headers, não o conteúdo
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
      }
    })
    
    const contentType = response.headers.get('content-type')
    console.log('📋 Content-Type detectado:', contentType)
    
    return contentType
  } catch (error) {
    console.error('❌ Erro ao buscar Content-Type:', error)
    return null
  }
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
    
    // Validar que não está tentando enviar para o próprio número (evita erro 63031)
    if (formattedFrom === formattedTo) {
      console.error('⚠️ ERRO: Tentativa de enviar mensagem para o próprio número Twilio bloqueada')
      console.error('  From:', formattedFrom)
      console.error('  To:', formattedTo)
      return // Retorna silenciosamente sem tentar enviar
    }
    
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

// ===== ONBOARDING FUNCTIONS =====

async function handleNewUserOnboarding(from: string, phone: string) {
  try {
    // Criar token de onboarding
    const onboardingToken = createOnboardingToken(phone)
    
    // Montar URL de onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finsplit.app'
    const onboardingUrl = `${baseUrl}/onboarding?token=${onboardingToken}&phone=${encodeURIComponent(phone)}`
    
    const message = `🚀 *Onboarding FinSplit*

Em 1 minuto você ativa sua conta, cria um grupo e já lança sua primeira despesa.

🔗 *Criar minha conta agora:*
${onboardingUrl}

Depois de concluir, volte aqui que já te mostro como enviar o recibo! 📸`

    await sendWhatsAppMessage(from, message)
    return NextResponse.json({ message: 'Onboarding iniciado para usuário novo' })
  } catch (error) {
    console.error('Erro ao iniciar onboarding:', error)
    return NextResponse.json({ message: 'Erro no onboarding' }, { status: 500 })
  }
}

async function handleExistingUserOnboarding(from: string, user: any) {
  try {
    // Criar novo token de onboarding para usuário existente
    const phone = from.replace('whatsapp:', '')
    const onboardingToken = createOnboardingToken(phone)
    
    // Montar URL de onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finsplit.app'
    const onboardingUrl = `${baseUrl}/onboarding?token=${onboardingToken}&phone=${encodeURIComponent(phone)}&existing=true`
    
    const message = `🔄 *Refazer Configuração*

Olá ${user.name}! Vou te guiar novamente pelo processo de configuração.

🔗 *Acessar configuração guiada:*
${onboardingUrl}

Você pode criar novos grupos, categorias e aprender a usar todas as funcionalidades! 🎯`

    await sendWhatsAppMessage(from, message)
    return NextResponse.json({ message: 'Onboarding iniciado para usuário existente' })
  } catch (error) {
    console.error('Erro ao iniciar onboarding para usuário existente:', error)
    return NextResponse.json({ message: 'Erro no onboarding' }, { status: 500 })
  }
}

async function handleOnboardingReturn(from: string, message: string) {
  try {
    // Extrair token da mensagem
    const tokenPart = extractTokenFromMessage(message)
    if (!tokenPart) {
      await sendWhatsAppMessage(from, '❌ Token não encontrado. Tente refazer o cadastro.')
      return NextResponse.json({ message: 'Token não encontrado' })
    }

    console.log('🔍 Token extraído:', tokenPart)
    
    // Buscar todos os tokens recentes e tentar encontrar um que termine com esse sufixo
    // (Como só temos o final do token na mensagem)
    const phone = from.replace('whatsapp:', '')
    
    // Tentar buscar usuário que acabou de ser criado pelo telefone
    const recentUser = await prisma.user.findFirst({
      where: {
        phone: { contains: phone.slice(-11) },
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } // Últimos 30 minutos
      },
      include: { tenant: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!recentUser) {
      await sendWhatsAppMessage(from, '❌ Cadastro não encontrado. Tente refazer o processo.')
      return NextResponse.json({ message: 'Usuário recente não encontrado' })
    }

    // Buscar grupo e categoria criados
    const group = await prisma.group.findFirst({
      where: { tenantId: recentUser.tenantId },
      orderBy: { createdAt: 'desc' }
    })

    const category = await prisma.category.findFirst({
      where: { tenantId: recentUser.tenantId },
      orderBy: { createdAt: 'desc' }
    })

    const welcomeMessage = `🎉 Cadastro concluído!

Seu grupo "${group?.name || 'Principal'}" e a categoria "${category?.name || 'Alimentação'}" já estão prontos.

📸 Envie a foto do seu primeiro recibo aqui mesmo quando quiser.

A IA vai extrair automaticamente:
• Valor da despesa
• Data e estabelecimento  
• Categoria sugerida

É só confirmar e pronto! 🚀`

    await sendWhatsAppMessage(from, welcomeMessage)
    return NextResponse.json({ message: 'Onboarding concluído com sucesso' })

  } catch (error) {
    console.error('Erro ao processar retorno do onboarding:', error)
    await sendWhatsAppMessage(from, '❌ Erro no processo. Tente enviar uma foto de recibo diretamente.')
    return NextResponse.json({ message: 'Erro no retorno do onboarding' }, { status: 500 })
  }
}

async function handleReceiptConfirmation(from: string, user: any, confirm: boolean) {
  try {
    if (confirm) {
      // Buscar último recibo em processo deste usuário
      const lastReceipt = await prisma.expense.findFirst({
        where: {
          group: {
            tenantId: user.tenantId
          },
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (lastReceipt) {
        // Confirmar recibo
        await prisma.expense.update({
          where: { id: lastReceipt.id },
          data: { status: 'CONFIRMED' }
        })

        await sendWhatsAppMessage(from, `✅ Despesa lançada com sucesso!

💰 Valor: R$ ${lastReceipt.amount.toFixed(2)}
📅 Data: ${lastReceipt.date.toLocaleDateString('pt-BR')}

Quer lançar outro recibo? É só mandar a foto! 📸`)
      } else {
        await sendWhatsAppMessage(from, '❌ Nenhum recibo para confirmar. Envie uma foto primeiro.')
      }
    } else {
      // Solicitar correção
      await sendWhatsAppMessage(from, `O que deseja corrigir?

1️⃣ Grupo
2️⃣ Recebedor
3️⃣ Valor  
4️⃣ Data
5️⃣ Categoria

Digite o número da opção:`)
    }

    return NextResponse.json({ message: 'Confirmação processada' })
  } catch (error) {
    console.error('Erro na confirmação:', error)
    return NextResponse.json({ message: 'Erro na confirmação' }, { status: 500 })
  }
}

// ===== COMANDOS DO WHATSAPP =====

async function handleHelpCommand(from: string, user: any) {
  const helpMessage = `🤖 *Menu de Comandos do FinSplit*

📱 *O que você pode fazer aqui:*

🔄 *onboarding* - Refazer configuração guiada

• Envie um *recibo* (foto) - IA organiza automaticamente
• Digite *saldo* - veja seus débitos e créditos  
• Digite *grupos* - gerencie seus grupos
• Digite *lançamento* - registre despesa manual
• Digite *relatório* - resumo das suas finanças
• Digite *planos* - veja recursos disponíveis

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

      // Usar o novo fluxo de confirmação final ao invés do antigo
      return await showFinalConfirmation(from, user, userState, newGroup.id)
      
    } else if (selection > 0 && selection <= userState.userGroups.length) {
      // Selecionar grupo existente do usuário
      const selectedGroup = userState.userGroups[selection - 1]
      
      
      // Usar o novo fluxo de confirmação final ao invés do antigo
      return await showFinalConfirmation(from, user, userState, selectedGroup.id)
      
    } else {
      await sendWhatsAppMessage(from, `❌ Número inválido. Digite um número entre 1 e ${userState.userGroups.length}, ou "0" para novo grupo.`)
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

async function handleCreateFirstGroup(from: string, user: any, userState: any) {
  try {
    const message = `🏗️ *Vamos criar seu primeiro grupo!*

💡 Escolha uma dessas opções ou crie um personalizado:

1️⃣ *Empresa* - Despesas profissionais
2️⃣ *Casa* - Gastos domésticos  
3️⃣ *Viagem* - Despesas de viagem
4️⃣ *Família* - Gastos familiares
5️⃣ *Eventos* - Festa, casamento, aniversário

0️⃣ *Personalizado* - Digite o nome do seu grupo

Digite o número da opção ou o nome do grupo personalizado:`

    await sendWhatsAppMessage(from, message)
    
    // Atualizar estado para aguardar nome do grupo
    await setUserState(user.id, { 
      action: 'CREATING_FIRST_GROUP', 
      pendingExpenseId: userState.pendingExpenseId, // Manter ID da despesa
      pendingExpenseData: userState.pendingExpenseData
    })
    
    return NextResponse.json({ message: 'Solicitando nome do grupo' })
    
  } catch (error) {
    console.error('❌ Erro ao solicitar criação de grupo:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function handleGroupCreation(from: string, text: string, user: any, userState: any) {
  try {
    let groupName = ''
    let groupDescription = ''
    
    // Mapear opções pré-definidas
    switch (text) {
      case '1':
        groupName = 'Empresa'
        groupDescription = 'Despesas profissionais e corporativas'
        break
      case '2':
        groupName = 'Casa'
        groupDescription = 'Gastos domésticos e residenciais'
        break
      case '3':
        groupName = 'Viagem'
        groupDescription = 'Despesas de viagens e turismo'
        break
      case '4':
        groupName = 'Família'
        groupDescription = 'Gastos familiares compartilhados'
        break
      case '5':
        groupName = 'Eventos'
        groupDescription = 'Despesas de festas e eventos especiais'
        break
      case '0':
        await sendWhatsAppMessage(from, '✍️ Digite o nome do seu grupo personalizado:')
        await setUserState(user.id, { 
          action: 'TYPING_GROUP_NAME', 
          pendingExpenseId: userState.pendingExpenseId, // Manter ID da despesa
          pendingExpenseData: userState.pendingExpenseData
        })
        return NextResponse.json({ message: 'Aguardando nome personalizado' })
      default:
        // Usar o texto como nome personalizado
        groupName = text.trim()
        groupDescription = `Grupo criado via WhatsApp`
    }
    
    // Criar o grupo
    const newGroup = await prisma.group.create({
      data: {
        name: groupName,
        description: groupDescription,
        tenantId: user.tenantId,
        members: {
          create: {
            userId: user.id,
            role: 'ADMIN'
          }
        }
      }
    })
    
    await sendWhatsAppMessage(from, `✅ *Grupo "${newGroup.name}" criado com sucesso!*

Agora você já pode usar esse grupo para organizar suas despesas.

👍 Responda *"sim"* para confirmar e registrar seu recibo neste grupo.`)
    
    // Usar o novo fluxo de confirmação final
    await setUserState(user.id, {
      ...userState,
      action: 'FINAL_CONFIRMATION',
      selectedGroupId: newGroup.id
    })
    
    return NextResponse.json({ message: 'Grupo criado com sucesso' })
    
  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao criar o grupo. Tente novamente.')
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ===== NOVO FLUXO DE CONFIRMAÇÃO =====

async function handleReceiptConfirmationChoice(from: string, text: string, user: any, userState: any) {
  try {
    const choice = text.trim()
    
    if (choice === '1') {
      // Confirmar dados - prosseguir para seleção de grupo
      console.log('✅ Dados confirmados pelo usuário')
      return await showGroupSelection(from, user, userState)
    } else if (choice === '2') {
      // Corrigir dados - mostrar menu de correção
      console.log('✏️ Usuário quer corrigir dados')
      
      const message = `O que deseja corrigir?
1 Recebedor · 2 Valor · 3 Data · 4 Tipo
0 Cancelar correções`
      
      await sendWhatsAppMessage(from, message)
      
      // Atualizar estado para menu de edição
      await setUserState(user.id, { 
        ...userState,
        action: 'RECEIPT_EDITING'
      })
      
      return NextResponse.json({ message: 'Menu de correção exibido' })
    } else {
      await sendWhatsAppMessage(from, 'Não entendi. Responda com 1 para Confirmar ou 2 para Corrigir.')
      return NextResponse.json({ message: 'Opção inválida' })
    }
  } catch (error) {
    console.error('❌ Erro ao processar confirmação:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function handleReceiptEditingMenu(from: string, text: string, user: any, userState: any) {
  try {
    const choice = text.trim()
    
    switch (choice) {
      case '1':
        // Corrigir recebedor
        await sendWhatsAppMessage(from, 'Informe o novo recebedor (ex.: "Elidy Importação e Exportação Ltda")')
        await setUserState(user.id, { 
          ...userState,
          action: 'RECEIPT_EDITING_FIELD',
          editingField: 'recebedor'
        })
        break
      case '2':
        // Corrigir valor
        await sendWhatsAppMessage(from, 'Informe o novo valor (ex.: 1089.76 ou 1.089,76)')
        await setUserState(user.id, { 
          ...userState,
          action: 'RECEIPT_EDITING_FIELD',
          editingField: 'valor'
        })
        break
      case '3':
        // Corrigir data
        await sendWhatsAppMessage(from, 'Informe a nova data (ex.: 26/10/2022)')
        await setUserState(user.id, { 
          ...userState,
          action: 'RECEIPT_EDITING_FIELD',
          editingField: 'data'
        })
        break
      case '4':
        // Corrigir tipo
        await sendWhatsAppMessage(from, 'Informe o tipo (ex.: recibo, nota fiscal, comprovante)')
        await setUserState(user.id, { 
          ...userState,
          action: 'RECEIPT_EDITING_FIELD',
          editingField: 'tipo'
        })
        break
      case '0':
        // Cancelar correções - mostrar resumo novamente
        await showReceiptSummary(from, userState.extractedData)
        await setUserState(user.id, { 
          ...userState,
          action: 'RECEIPT_CONFIRMATION'
        })
        break
      default:
        await sendWhatsAppMessage(from, 'Opção inválida. Digite 1, 2, 3, 4 ou 0.')
        break
    }
    
    return NextResponse.json({ message: 'Menu de edição processado' })
  } catch (error) {
    console.error('❌ Erro no menu de edição:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function handleReceiptFieldEdit(from: string, text: string, user: any, userState: any) {
  try {
    const field = userState.editingField
    const newValue = text.trim()
    
    // Validar e atualizar campo específico
    let isValid = true
    let errorMessage = ''
    let updatedValue = newValue
    
    switch (field) {
      case 'valor':
        const validation = validateValue(newValue)
        if (!validation.isValid) {
          isValid = false
          errorMessage = validation.error || 'Valor inválido'
        } else {
          updatedValue = validation.value?.toString() || newValue
        }
        break
      case 'data':
        const dateValidation = validateDate(newValue)
        if (!dateValidation.isValid) {
          isValid = false
          errorMessage = dateValidation.error || 'Data inválida'
        } else {
          updatedValue = dateValidation.value || newValue
        }
        break
      case 'recebedor':
        if (newValue.length < 2) {
          isValid = false
          errorMessage = 'Nome muito curto. Tente algo como "Empresa ABC Ltda".'
        }
        break
      case 'tipo':
        // Normalizar tipos comuns
        const normalizedType = newValue.toLowerCase()
        if (normalizedType.includes('nota') || normalizedType.includes('fiscal')) {
          updatedValue = 'nota fiscal'
        } else if (normalizedType.includes('comprovante')) {
          updatedValue = 'comprovante'
        } else if (normalizedType.includes('recibo')) {
          updatedValue = 'recibo'
        }
        break
    }
    
    if (!isValid) {
      await sendWhatsAppMessage(from, errorMessage)
      return NextResponse.json({ message: 'Valor inválido' })
    }
    
    // Atualizar dados extraídos
    const updatedData = { ...userState.extractedData }
    updatedData[field] = updatedValue
    
    // Mostrar resumo atualizado
    await sendWhatsAppMessage(from, `✅ Atualizei.`)
    await showReceiptSummary(from, updatedData)
    
    // Voltar para confirmação
    await setUserState(user.id, { 
      ...userState,
      extractedData: updatedData,
      action: 'RECEIPT_CONFIRMATION'
    })
    
    return NextResponse.json({ message: 'Campo atualizado' })
  } catch (error) {
    console.error('❌ Erro ao editar campo:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function showGroupSelection(from: string, user: any, userState: any) {
  try {
    console.log('📋 Buscando grupos do usuário...')
    
    // Buscar grupos do usuário
    const userGroups = await getUserGroups(user.id, user.tenantId)
    console.log('📋 Grupos encontrados:', userGroups.length)
    
    if (userGroups.length > 0) {
      let message = `📋 Em qual grupo deseja lançar esta despesa?\n`
      userGroups.forEach((group, index) => {
        message += `${index + 1} ${group.name}\n`
      })
      message += `0 Criar novo grupo`
      
      await sendWhatsAppMessage(from, message)
      
      // Atualizar estado
      await setUserState(user.id, { 
        ...userState,
        action: 'GROUP_SELECTION',
        userGroups: userGroups
      })
    } else {
      const message = `📋 Você ainda não tem grupos cadastrados!

💡 *O que são grupos?*
Grupos são centros de custo para organizar suas despesas:

🏢 *Empresa* - Despesas profissionais
✈️ *Viagem* - Gastos de viagens específicas  
🏠 *Casa* - Despesas domésticas
👨‍👩‍👧‍👦 *Família* - Gastos familiares
🎉 *Eventos* - Festa, casamento, aniversário

✍️ Qual o nome do seu primeiro grupo?
Ex.: "Obra Casa", "Viagem Família", "Empresa X"
(digite cancelar para voltar)`
      
      await sendWhatsAppMessage(from, message)
      
      // Atualizar estado para criação de grupo
      await setUserState(user.id, { 
        ...userState,
        action: 'GROUP_CREATION'
      })
    }
    
    return NextResponse.json({ message: 'Seleção de grupo exibida' })
  } catch (error) {
    console.error('❌ Erro ao mostrar grupos:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function handleNewGroupCreation(from: string, text: string, user: any, userState: any) {
  try {
    const groupName = text.trim()
    
    if (groupName.toLowerCase() === 'cancelar') {
      await showGroupSelection(from, user, userState)
      return NextResponse.json({ message: 'Criação cancelada' })
    }
    
    if (groupName.length < 2) {
      await sendWhatsAppMessage(from, 'Nome muito curto. Tente algo como "Obra Casa".')
      return NextResponse.json({ message: 'Nome muito curto' })
    }
    
    // Criar novo grupo
    const newGroup = await prisma.group.create({
      data: {
        name: groupName,
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
    
    // Ir diretamente para confirmação final com o novo grupo
    await sendWhatsAppMessage(from, `✅ Grupo "${newGroup.name}" criado.`)
    
    return await showFinalConfirmation(from, user, userState, newGroup.id)
  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao criar o grupo. Tente novamente.')
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function showReceiptSummary(from: string, extractedData: any) {
  // Formatação da data para exibição
  let dataFormatada = 'Não identificada'
  try {
    const dataObj = new Date(extractedData.data)
    if (!isNaN(dataObj.getTime())) {
      dataFormatada = dataObj.toLocaleDateString('pt-BR')
    }
  } catch (error) {
    console.log('Erro ao formatar data:', error)
  }

  const message = `👤 Recebedor: ${extractedData.recebedor}
💰 Valor: R$ ${typeof extractedData.valor === 'number' ? extractedData.valor.toFixed(2).replace('.', ',') : extractedData.valor}
📅 Data: ${dataFormatada}
📄 Tipo: ${extractedData.tipo}

Estes dados estão corretos?
1 Confirmar · 2 Corrigir`
  
  await sendWhatsAppMessage(from, message)
}

// ===== FUNÇÕES DE VALIDAÇÃO =====

function validateValue(input: string): { isValid: boolean; value?: number; error?: string } {
  try {
    // Aceitar formatos: 1089.76, 1.089,76, 1,089.76, etc.
    const cleaned = input.replace(/[^\d,.-]/g, '')
    
    // Converter vírgula decimal para ponto
    let normalized = cleaned
    if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Apenas vírgula = decimal (1089,76)
      normalized = cleaned.replace(',', '.')
    } else if (cleaned.includes(',') && cleaned.includes('.')) {
      // Ambos: último é decimal (1.089,76)
      const lastComma = cleaned.lastIndexOf(',')
      const lastDot = cleaned.lastIndexOf('.')
      if (lastComma > lastDot) {
        // Vírgula é decimal
        normalized = cleaned.substring(0, lastComma).replace(/[,.]/g, '') + '.' + cleaned.substring(lastComma + 1)
      }
    }
    
    const value = parseFloat(normalized)
    
    if (isNaN(value) || value <= 0) {
      return {
        isValid: false,
        error: 'Não reconheci esse valor. Tente 1089.76 ou 1.089,76.'
      }
    }
    
    return { isValid: true, value }
  } catch (error) {
    return {
      isValid: false,
      error: 'Não reconheci esse valor. Tente 1089.76 ou 1.089,76.'
    }
  }
}

function validateDate(input: string): { isValid: boolean; value?: string; error?: string } {
  try {
    const cleaned = input.trim()
    
    // Tentar vários formatos
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/AAAA
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // AAAA-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-AAAA
    ]
    
    for (const format of formats) {
      const match = cleaned.match(format)
      if (match) {
        let day, month, year
        
        if (format.source.includes('(\\d{4})')) {
          // AAAA-MM-DD
          [, year, month, day] = match
        } else {
          // DD/MM/AAAA ou DD-MM-AAAA
          [, day, month, year] = match
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        
        if (!isNaN(date.getTime()) && 
            date.getFullYear() == parseInt(year) && 
            date.getMonth() == parseInt(month) - 1 && 
            date.getDate() == parseInt(day)) {
          return { 
            isValid: true, 
            value: date.toISOString().split('T')[0] 
          }
        }
      }
    }
    
    return {
      isValid: false,
      error: 'Data inválida. Exemplo: 26/10/2022.'
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Data inválida. Exemplo: 26/10/2022.'
    }
  }
}

async function showFinalConfirmation(from: string, user: any, userState: any, groupId: string) {
  try {
    // Buscar dados do grupo selecionado
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    })
    
    if (!group) {
      await sendWhatsAppMessage(from, '❌ Grupo não encontrado. Tente novamente.')
      return NextResponse.json({ message: 'Grupo não encontrado' }, { status: 404 })
    }
    
    // Formatação da data
    let dataFormatada = 'Não identificada'
    try {
      const dataObj = new Date(userState.extractedData.data)
      if (!isNaN(dataObj.getTime())) {
        dataFormatada = dataObj.toLocaleDateString('pt-BR')
      }
    } catch (error) {
      console.log('Erro ao formatar data:', error)
    }
    
    const message = `🔎 Revise antes de salvar:
Grupo: ${group.name}
Recebedor: ${userState.extractedData.recebedor}
Valor: R$ ${typeof userState.extractedData.valor === 'number' ? userState.extractedData.valor.toFixed(2).replace('.', ',') : userState.extractedData.valor}
Data: ${dataFormatada}
Tipo: ${userState.extractedData.tipo}

1 Salvar · 2 Editar`
    
    await sendWhatsAppMessage(from, message)
    
    // Atualizar estado para confirmação final
    await setUserState(user.id, { 
      ...userState,
      action: 'FINAL_CONFIRMATION',
      selectedGroupId: groupId,
      selectedGroupName: group.name
    })
    
    return NextResponse.json({ message: 'Confirmação final exibida' })
  } catch (error) {
    console.error('❌ Erro na confirmação final:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

async function handleFinalConfirmation(from: string, text: string, user: any, userState: any) {
  try {
    const choice = text.trim().toLowerCase()
    
    if (choice === '1' || choice === 'sim' || choice === 'confirmar') {
      // Salvar despesa
      console.log('💾 Salvando despesa no banco...')
      
      // Determinar tipos de mídia e documento
      const contentType = await getMediaContentType(userState.mediaUrl)
      const isImage = contentType?.startsWith('image/')
      const isPdf = contentType?.includes('pdf')
      
      // Criar despesa no banco
      const expense = await prisma.expense.create({
        data: {
          description: userState.extractedData.recebedor,
          amount: userState.extractedData.valor,
          date: new Date(userState.extractedData.data),
          status: 'CONFIRMED',
          receiptUrl: userState.mediaUrl,
          receiptData: userState.originalData,
          aiExtracted: true,
          aiConfidence: userState.confidence,
          mediaType: contentType || 'application/octet-stream',
          documentType: isImage ? 'recibo' : isPdf ? 'nota_fiscal' : 'comprovante',
          paidBy: {
            connect: { id: user.id }
          },
          group: {
            connect: { id: userState.selectedGroupId }
          },
          categoryId: undefined
        }
      })
      
      console.log('✅ Despesa criada com sucesso:', expense.id)

      // Log de auditoria
      await prisma.auditLog.create({
        data: {
          action: 'EXPENSE_CREATED_WHATSAPP',
          entity: 'EXPENSE',
          entityId: expense.id,
          details: { 
            mediaUrl: userState.mediaUrl, 
            aiConfidence: userState.confidence,
            groupId: userState.selectedGroupId
          },
          tenantId: user.tenantId,
          userId: user.id
        }
      })

      // Link correto para o dashboard
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://finsplit.app'
      const dashboardUrl = `${baseUrl}/dashboard/groups/${userState.selectedGroupId}`
      
      const successMessage = `✅ Despesa lançada no grupo ${userState.selectedGroupName}.

🔗 Abrir no painel:
${dashboardUrl}

Envie outra foto quando quiser 📸`
      
      await sendWhatsAppMessage(from, successMessage)
      
      // Limpar estado do usuário
      await setUserState(user.id, null)
      
      return NextResponse.json({ message: 'Despesa salva com sucesso' })
      
    } else if (choice === '2' || choice === 'editar' || choice === 'corrigir') {
      // Voltar para edição - mostrar resumo novamente
      await showReceiptSummary(from, userState.extractedData)
      
      await setUserState(user.id, { 
        ...userState,
        action: 'RECEIPT_CONFIRMATION'
      })
      
      return NextResponse.json({ message: 'Voltando para edição' })
      
    } else {
      await sendWhatsAppMessage(from, 'Não entendi. Responda com 1 para Salvar ou 2 para Editar.')
      return NextResponse.json({ message: 'Opção inválida' })
    }
  } catch (error) {
    console.error('❌ Erro na confirmação final:', error)
    await sendWhatsAppMessage(from, '❌ Erro ao salvar despesa. Tente novamente.')
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

 