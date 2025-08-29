const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
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

    console.log('📱 Usuários no banco:')
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}): ${user.phone || 'Sem telefone'} [${user.role}]`)
    })

    // Buscar usuário específico pelo telefone
    const userByPhone = await prisma.user.findUnique({
      where: { phone: '+5538997279959' }
    })

    if (userByPhone) {
      console.log(`\n📞 Usuário com telefone +5538997279959:`)
      console.log(`- Nome: ${userByPhone.name}`)
      console.log(`- Email: ${userByPhone.email}`)
      console.log(`- Role: ${userByPhone.role}`)
    } else {
      console.log('\n📞 Nenhum usuário encontrado com telefone +5538997279959')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers() 