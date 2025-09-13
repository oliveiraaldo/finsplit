require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugUser() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...')
    
    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    })

    console.log('\n📱 Todos os usuários:')
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.phone || 'Sem telefone'} [${user.role}]`)
    })

    // Verificar usuário específico pelo telefone do sandbox
    const testPhone = '+5538997279959'
    console.log(`\n🔍 Buscando usuário com telefone: ${testPhone}`)
    
    const userByPhone = await prisma.user.findUnique({
      where: { phone: testPhone },
      include: { tenant: true }
    })

    if (userByPhone) {
      console.log('✅ Usuário encontrado:')
      console.log(`  - Nome: ${userByPhone.name}`)
      console.log(`  - Email: ${userByPhone.email}`)
      console.log(`  - Telefone: ${userByPhone.phone}`)
      console.log(`  - Role: ${userByPhone.role}`)
      console.log(`  - Tenant: ${userByPhone.tenant.name}`)
      console.log(`  - WhatsApp habilitado: ${userByPhone.tenant.hasWhatsApp}`)
      console.log(`  - Créditos: ${userByPhone.tenant.credits}`)
    } else {
      console.log('❌ Usuário NÃO encontrado!')
      
      // Verificar se há usuários com telefones similares
      console.log('\n🔍 Buscando por telefones similares...')
      const similarUsers = await prisma.user.findMany({
        where: {
          phone: {
            contains: '38997279959'
          }
        }
      })
      
      if (similarUsers.length > 0) {
        console.log('📱 Usuários com telefones similares:')
        similarUsers.forEach(u => {
          console.log(`  - ${u.name}: ${u.phone}`)
        })
      } else {
        console.log('📱 Nenhum usuário com telefone similar encontrado')
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUser()
