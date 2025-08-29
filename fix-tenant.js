const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixTenant() {
  try {
    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { phone: '+5538997279959' },
      include: { tenant: true }
    })

    if (!user) {
      console.log('❌ Usuário não encontrado')
      return
    }

    console.log('🔧 Corrigindo tenant do usuário:', user.name)
    console.log('🏢 Tenant atual:', user.tenant.name)
    console.log('📱 WhatsApp habilitado:', user.tenant.hasWhatsApp)
    console.log('💳 Créditos:', user.tenant.credits)

    // Atualizar tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        hasWhatsApp: true,
        hasAI: true,
        credits: 1000,
        plan: 'PREMIUM'
      }
    })

    console.log('\n✅ Tenant atualizado:')
    console.log(`- WhatsApp habilitado: ${updatedTenant.hasWhatsApp}`)
    console.log(`- IA habilitada: ${updatedTenant.hasAI}`)
    console.log(`- Créditos: ${updatedTenant.credits}`)
    console.log(`- Plano: ${updatedTenant.plan}`)

    // Verificar usuário atualizado
    const updatedUser = await prisma.user.findUnique({
      where: { phone: '+5538997279959' },
      include: { tenant: true }
    })

    console.log('\n✅ Usuário atualizado:')
    console.log(`- Nome: ${updatedUser.name}`)
    console.log(`- WhatsApp habilitado: ${updatedUser.tenant.hasWhatsApp}`)
    console.log(`- Créditos: ${updatedUser.tenant.credits}`)

  } catch (error) {
    console.error('❌ Erro ao corrigir tenant:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTenant() 