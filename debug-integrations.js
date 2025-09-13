require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugIntegrations() {
  try {
    console.log('🔍 Verificando configurações das integrações...\n')

    // 1. Verificar variáveis de ambiente
    console.log('📋 VARIÁVEIS DE AMBIENTE:')
    console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada'}`)
    console.log(`- TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configurada' : '❌ Não configurada'}`)
    console.log(`- TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Configurada' : '❌ Não configurada'}`)
    console.log(`- TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? '✅ Configurada' : '❌ Não configurada'}`)
    console.log(`- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`)

    // 2. Verificar usuário de teste
    const testPhone = '+5538997279959'
    console.log(`\n👤 USUÁRIO DE TESTE (${testPhone}):`)
    
    const user = await prisma.user.findUnique({
      where: { phone: testPhone },
      include: { tenant: true }
    })

    if (user) {
      console.log(`✅ Usuário encontrado: ${user.name}`)
      console.log(`✅ Email: ${user.email}`)
      console.log(`✅ Tenant: ${user.tenant.name}`)
      console.log(`✅ WhatsApp habilitado: ${user.tenant.hasWhatsApp}`)
      console.log(`✅ Créditos: ${user.tenant.credits}`)
      console.log(`✅ Plano: ${user.tenant.plan}`)
    } else {
      console.log('❌ Usuário não encontrado!')
    }

    // 3. Verificar todos os usuários com WhatsApp habilitado
    console.log('\n📱 USUÁRIOS COM WHATSAPP HABILITADO:')
    const whatsappUsers = await prisma.user.findMany({
      where: {
        tenant: {
          hasWhatsApp: true
        }
      },
      select: {
        name: true,
        phone: true,
        email: true,
        tenant: {
          select: {
            name: true,
            hasWhatsApp: true,
            credits: true,
            plan: true
          }
        }
      }
    })

    if (whatsappUsers.length > 0) {
      whatsappUsers.forEach(u => {
        console.log(`- ${u.name} (${u.phone}): ${u.tenant.credits} créditos [${u.tenant.plan}]`)
      })
    } else {
      console.log('❌ Nenhum usuário com WhatsApp habilitado encontrado!')
    }

    // 4. Testar conexão com Twilio
    console.log('\n📞 TESTE DE CONEXÃO TWILIO:')
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
        const account = await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
        console.log(`✅ Conexão com Twilio OK - Account: ${account.friendlyName}`)
        console.log(`✅ Status: ${account.status}`)
      } catch (error) {
        console.log(`❌ Erro na conexão com Twilio: ${error.message}`)
      }
    } else {
      console.log('❌ Credenciais do Twilio não configuradas')
    }

    // 5. Testar conexão com OpenAI
    console.log('\n🤖 TESTE DE CONEXÃO OPENAI:')
    if (process.env.OPENAI_API_KEY) {
      try {
        const { OpenAI } = require('openai')
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        
        // Teste simples
        const response = await openai.models.list()
        console.log(`✅ Conexão com OpenAI OK - ${response.data.length} modelos disponíveis`)
      } catch (error) {
        console.log(`❌ Erro na conexão com OpenAI: ${error.message}`)
      }
    } else {
      console.log('❌ API Key do OpenAI não configurada')
    }

    // 6. Verificar webhook logs recentes
    console.log('\n📋 LOGS DE AUDITORIA RECENTES:')
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: 'WHATSAPP_MESSAGE_SENT' },
          { action: 'RECEIPT_UPLOAD_WHATSAPP' },
          { action: 'EXPENSE_CONFIRMED_WHATSAPP' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, phone: true } }
      }
    })

    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        console.log(`- ${log.createdAt.toISOString()}: ${log.action} (${log.user.name})`)
      })
    } else {
      console.log('❌ Nenhum log de WhatsApp encontrado')
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugIntegrations()
