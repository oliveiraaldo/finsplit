import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, tenantName, tenantType, planId } = body

    // Validações básicas
    if (!name || !email || !password || !tenantName) {
      return NextResponse.json(
        { message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Validar e verificar telefone
    if (phone) {
      // Validar formato do telefone brasileiro
      if (!validateBrazilianPhone(phone)) {
        return NextResponse.json(
          { message: 'Formato de telefone inválido. Use o formato brasileiro com DDD.' },
          { status: 400 }
        )
      }

      const existingPhone = await prisma.user.findUnique({
        where: { phone }
      })

      if (existingPhone) {
        return NextResponse.json(
          { message: 'Este telefone já está em uso' },
          { status: 400 }
        )
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Buscar configurações do plano selecionado
    let selectedPlan = null
    let planConfig = {
      maxGroups: 1,
      maxMembers: 5,
      maxExports: 10,
      hasWhatsApp: false,
      hasAI: false,
      credits: 0
    }

    if (planId) {
      selectedPlan = await prisma.plan.findUnique({
        where: { id: planId, isActive: true }
      })

      if (selectedPlan) {
        planConfig = {
          maxGroups: selectedPlan.maxGroups,
          maxMembers: selectedPlan.maxMembers,
          maxExports: 10, // Valor padrão, pode ser adicionado ao modelo Plan depois
          hasWhatsApp: selectedPlan.hasWhatsApp,
          hasAI: selectedPlan.hasWhatsApp, // Assumindo que IA vem junto com WhatsApp
          credits: selectedPlan.creditsIncluded
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Criar tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          type: tenantType || 'BUSINESS',
          plan: selectedPlan?.price === 0 ? 'FREE' : 'PREMIUM',
          planId: selectedPlan?.id,
          ...planConfig
        }
      })

      // Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'CLIENT',
          tenantId: tenant.id
        }
      })

      // Criar grupo padrão
      const defaultGroup = await tx.group.create({
        data: {
          name: 'Grupo Principal',
          description: 'Grupo padrão criado automaticamente',
          tenantId: tenant.id
        }
      })

      // Adicionar usuário como owner do grupo
      await tx.groupMember.create({
        data: {
          userId: user.id,
          groupId: defaultGroup.id,
          role: 'OWNER'
        }
      })

      // Criar categorias padrão baseadas no tipo de tenant
      const getDefaultCategories = (type: string) => {
        switch (type) {
          case 'BUSINESS':
            return [
              { name: 'Escritório', color: '#FF6B6B' },
              { name: 'Transporte', color: '#4ECDC4' },
              { name: 'Alimentação', color: '#45B7D1' },
              { name: 'Material', color: '#96CEB4' },
              { name: 'Serviços', color: '#FFEAA7' },
              { name: 'Marketing', color: '#DDA0DD' }
            ]
          case 'FAMILY':
            return [
              { name: 'Supermercado', color: '#FF6B6B' },
              { name: 'Contas da Casa', color: '#4ECDC4' },
              { name: 'Transporte', color: '#45B7D1' },
              { name: 'Saúde', color: '#96CEB4' },
              { name: 'Educação', color: '#FFEAA7' },
              { name: 'Lazer', color: '#DDA0DD' }
            ]
          case 'PERSONAL':
            return [
              { name: 'Alimentação', color: '#FF6B6B' },
              { name: 'Transporte', color: '#4ECDC4' },
              { name: 'Compras', color: '#45B7D1' },
              { name: 'Entretenimento', color: '#96CEB4' },
              { name: 'Saúde', color: '#FFEAA7' },
              { name: 'Outros', color: '#DDA0DD' }
            ]
          default:
            return [
              { name: 'Alimentação', color: '#FF6B6B' },
              { name: 'Transporte', color: '#4ECDC4' },
              { name: 'Outros', color: '#FFEAA7' }
            ]
        }
      }

      const defaultCategories = getDefaultCategories(tenantType || 'BUSINESS')

      for (const category of defaultCategories) {
        await tx.category.create({
          data: {
            ...category,
            tenantId: tenant.id,
            groupId: defaultGroup.id
          }
        })
      }

      return { user, tenant, group: defaultGroup }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'USER_SIGNUP',
        entity: 'USER',
        entityId: result.user.id,
        details: { planId, planName: selectedPlan?.name, tenantName, tenantType },
        tenantId: result.tenant.id,
        userId: result.user.id
      }
    })

    // Enviar mensagem de boas-vindas pelo WhatsApp se houver telefone
    if (phone && phone.trim()) {
      try {
        await sendWelcomeMessage(result.user.name, phone)
        console.log('📱 Mensagem de boas-vindas enviada por WhatsApp')
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem de boas-vindas:', error)
        // Não falhar o cadastro por causa do WhatsApp
      }
    }

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        type: result.tenant.type
      },
      group: {
        id: result.group.id,
        name: result.group.name
      }
    })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função para validar telefone brasileiro
function validateBrazilianPhone(phone: string): boolean {
  // Remove todos os caracteres não numéricos
  const numbers = phone.replace(/\D/g, '')
  
  // Deve começar com 55 (código do Brasil)
  if (!numbers.startsWith('55')) {
    return false
  }
  
  // Remove o código do país para validar o número brasileiro
  const brazilianNumber = numbers.substring(2)
  
  // Deve ter 10 ou 11 dígitos (DDD + número)
  if (brazilianNumber.length !== 10 && brazilianNumber.length !== 11) {
    return false
  }
  
  // DDD deve estar entre 11 e 99
  const ddd = parseInt(brazilianNumber.substring(0, 2))
  if (ddd < 11 || ddd > 99) {
    return false
  }
  
  // Se for celular (11 dígitos), deve começar com 9
  if (brazilianNumber.length === 11 && brazilianNumber[2] !== '9') {
    return false
  }
  
  return true
}

// Função para enviar mensagem de boas-vindas no WhatsApp
async function sendWelcomeMessage(userName: string, phone: string) {
  try {
    const { twilioClient } = await import('@/lib/twilio')
    
    // Formatar número de telefone para WhatsApp
    const formattedPhone = phone.startsWith('+') ? `whatsapp:${phone}` : `whatsapp:+${phone}`
    const formattedFrom = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`

    const welcomeMessage = `👋 Olá, ${userName}! Seja bem-vindo(a) ao FinSplit 🎉

Aqui você pode organizar suas finanças de forma simples e prática.

👉 Alguns exemplos do que você já pode fazer:

• Criar grupos para família, viagens, empresa ou amigos
• Enviar recibos/fotos e deixar a IA organizar automaticamente  
• Acompanhar quem já pagou e quem ainda está devendo

Digite *ajuda* para ver todas as opções ou envie já o seu primeiro recibo 📸`

    console.log('📱 Enviando mensagem de boas-vindas para:', formattedPhone)

    await twilioClient.messages.create({
      body: welcomeMessage,
      from: formattedFrom,
      to: formattedPhone
    })

    console.log('✅ Mensagem de boas-vindas enviada com sucesso')
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de boas-vindas:', error)
    throw error
  }
}