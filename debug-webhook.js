const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugWebhook() {
  try {
    console.log('🔍 Debugando webhook...')
    
    // Simular exatamente o que o webhook recebe
    const from = 'whatsapp:+5538997279959'
    const body = 'Olá! Teste de webhook'
    
    console.log('📱 Dados recebidos:')
    console.log('  From:', from)
    console.log('  Body:', body)
    
    // Remover prefixo "whatsapp:" do número
    const phone = from.replace('whatsapp:', '')
    console.log('📞 Phone extraído:', phone)
    
    // Verificar se o telefone está exatamente igual
    console.log('\n🔍 Verificando banco de dados...')
    
    // Buscar usuário pelo telefone exato
    const user = await prisma.user.findUnique({
      where: { phone: phone },
      include: { tenant: true }
    })

    if (user) {
      console.log('✅ Usuário encontrado:')
      console.log(`  ID: ${user.id}`)
      console.log(`  Nome: ${user.name}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Telefone: ${user.phone}`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Tenant ID: ${user.tenantId}`)
      console.log(`  Tenant Nome: ${user.tenant.name}`)
      console.log(`  WhatsApp: ${user.tenant.hasWhatsApp}`)
      console.log(`  Créditos: ${user.tenant.credits}`)
    } else {
      console.log('❌ Usuário NÃO encontrado!')
      
      // Buscar todos os usuários para comparar
      console.log('\n🔍 Todos os usuários no banco:')
      const allUsers = await prisma.user.findMany({
        select: { name: true, phone: true, email: true }
      })
      
      allUsers.forEach(u => {
        console.log(`  - ${u.name}: ${u.phone || 'Sem telefone'} (${u.email})`)
      })
      
      // Verificar se há diferença de formatação
      console.log('\n🔍 Verificando formatação...')
      const userByPartialPhone = await prisma.user.findMany({
        where: {
          phone: {
            contains: '5538997279959'
          }
        }
      })
      
      if (userByPartialPhone.length > 0) {
        console.log('✅ Usuários encontrados por busca parcial:')
        userByPartialPhone.forEach(u => {
          console.log(`  - ${u.name}: ${u.phone}`)
        })
      } else {
        console.log('❌ Nenhum usuário encontrado por busca parcial')
      }
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugWebhook() 