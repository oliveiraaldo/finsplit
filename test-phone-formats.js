require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPhoneFormats() {
  try {
    console.log('🔍 Testando diferentes formatos de telefone...\n')

    // Formatos possíveis que o Twilio pode enviar
    const possibleFormats = [
      '+5538997279959',     // Formato brasileiro padrão
      '5538997279959',      // Sem o +
      '+55 38 99727-9959',  // Com espaços e hífen
      '+55 (38) 99727-9959', // Com parênteses
      '+55 38 9 9727-9959', // Com 9 extra
      '38997279959',        // Só DDD + número
      '5538997279959',      // Com código do país
    ]

    console.log('📱 Formatos a serem testados:')
    possibleFormats.forEach((format, index) => {
      console.log(`${index + 1}. "${format}"`)
    })

    console.log('\n🔍 Buscando no banco de dados...\n')

    for (const format of possibleFormats) {
      console.log(`Testando: "${format}"`)
      
      const user = await prisma.user.findUnique({
        where: { phone: format },
        select: { name: true, phone: true, email: true }
      })

      if (user) {
        console.log(`✅ ENCONTRADO: ${user.name} (${user.email})`)
      } else {
        console.log(`❌ Não encontrado`)
      }
      console.log('')
    }

    // Buscar todos os usuários para comparação
    console.log('📋 TODOS OS USUÁRIOS NO BANCO:')
    const allUsers = await prisma.user.findMany({
      select: { name: true, phone: true, email: true }
    })

    allUsers.forEach(user => {
      console.log(`- ${user.name}: "${user.phone}" (${user.email})`)
    })

    // Teste de busca parcial
    console.log('\n🔍 BUSCA PARCIAL (contém "38997279959"):')
    const partialUsers = await prisma.user.findMany({
      where: {
        phone: {
          contains: '38997279959'
        }
      },
      select: { name: true, phone: true, email: true }
    })

    if (partialUsers.length > 0) {
      partialUsers.forEach(user => {
        console.log(`✅ ${user.name}: "${user.phone}"`)
      })
    } else {
      console.log('❌ Nenhum usuário encontrado com busca parcial')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPhoneFormats()
