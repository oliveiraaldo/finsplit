const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updatePhone() {
  try {
    // Atualizar telefone do usuário admin
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@finsplit.com' },
      data: { phone: '+5538997279959' }
    })

    console.log('✅ Telefone atualizado:', updatedUser.phone)
    
    // Verificar se foi atualizado
    const user = await prisma.user.findUnique({
      where: { email: 'admin@finsplit.com' }
    })
    
    console.log('✅ Usuário atualizado:', {
      name: user.name,
      email: user.email,
      phone: user.phone
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar telefone:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePhone() 