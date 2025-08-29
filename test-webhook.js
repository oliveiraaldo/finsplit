const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testWebhook() {
  try {
    // Simular dados do Twilio
    const from = 'whatsapp:+5538997279959'
    const body = 'Olá! Teste de webhook'
    
    console.log('🧪 Testando webhook...')
    console.log('📱 From:', from)
    console.log('💬 Body:', body)
    
    // Remover prefixo "whatsapp:" do número
    const phone = from.replace('whatsapp:', '')
    console.log('📞 Phone:', phone)
    
    // Buscar usuário pelo telefone
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { tenant: true }
    })

    if (user) {
      console.log('✅ Usuário encontrado:')
      console.log(`- Nome: ${user.name}`)
      console.log(`- Email: ${user.email}`)
      console.log(`- Role: ${user.role}`)
      console.log(`- Tenant: ${user.tenant.name}`)
      console.log(`- WhatsApp habilitado: ${user.tenant.hasWhatsApp}`)
      console.log(`- Créditos: ${user.tenant.credits}`)
    } else {
      console.log('❌ Usuário não encontrado')
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testWebhook() 