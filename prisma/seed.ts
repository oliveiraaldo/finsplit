import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar tenant de exemplo
  const tenant = await prisma.tenant.create({
    data: {
      name: 'FinSplit Demo',
      plan: 'PREMIUM',
      maxGroups: 999999,
      maxMembers: 999999,
      maxExports: 999999,
      hasWhatsApp: true,
      hasAI: true,
      credits: 1000
    }
  })

  console.log('✅ Tenant criado:', tenant.name)

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@finsplit.com',
      password: hashedPassword,
      phone: '+5511999999999',
      role: 'ADMIN',

      tenantId: tenant.id
    }
  })

  console.log('✅ Usuário admin criado:', adminUser.email)

  // Criar usuário cliente
  const clientUser = await prisma.user.create({
    data: {
      name: 'João Silva',
      email: 'joao@finsplit.com',
      password: hashedPassword,
      phone: '+5511888888888',
      role: 'CLIENT',

      tenantId: tenant.id
    }
  })

  console.log('✅ Usuário cliente criado:', clientUser.email)

  // Criar grupos pré-definidos
  const groups = await prisma.group.createMany({
    data: [
      {
        name: 'Alimentação',
        description: 'Despesas com comida, restaurantes, mercado',
        tenantId: tenant.id
      },
      {
        name: 'Transporte',
        description: 'Uber, táxi, combustível, passagens',
        tenantId: tenant.id
      },
      {
        name: 'Lazer',
        description: 'Entretenimento, cinema, shows, viagens',
        tenantId: tenant.id
      },
      {
        name: 'Moradia',
        description: 'Aluguel, contas, manutenção',
        tenantId: tenant.id
      },
      {
        name: 'Viagem para São Paulo',
        description: 'Grupo para dividir despesas da viagem de negócios',
        tenantId: tenant.id
      }
    ]
  })

  console.log('✅ Grupos pré-definidos criados')

  // Buscar grupos para adicionar membros
  const alimentacaoGroup = await prisma.group.findFirst({ where: { name: 'Alimentação' } })
  const transporteGroup = await prisma.group.findFirst({ where: { name: 'Transporte' } })
  const lazerGroup = await prisma.group.findFirst({ where: { name: 'Lazer' } })
  const moradiaGroup = await prisma.group.findFirst({ where: { name: 'Moradia' } })
  const viagemGroup = await prisma.group.findFirst({ where: { name: 'Viagem para São Paulo' } })

  // Adicionar usuários aos grupos
  await prisma.groupMember.createMany({
    data: [
      {
        userId: adminUser.id,
        groupId: alimentacaoGroup!.id,
        role: 'OWNER'
      },
      {
        userId: clientUser.id,
        groupId: alimentacaoGroup!.id,
        role: 'MEMBER'
      },
      {
        userId: adminUser.id,
        groupId: transporteGroup!.id,
        role: 'OWNER'
      },
      {
        userId: clientUser.id,
        groupId: transporteGroup!.id,
        role: 'MEMBER'
      },
      {
        userId: adminUser.id,
        groupId: lazerGroup!.id,
        role: 'OWNER'
      },
      {
        userId: clientUser.id,
        groupId: lazerGroup!.id,
        role: 'MEMBER'
      },
      {
        userId: adminUser.id,
        groupId: moradiaGroup!.id,
        role: 'OWNER'
      },
      {
        userId: clientUser.id,
        groupId: moradiaGroup!.id,
        role: 'MEMBER'
      },
      {
        userId: adminUser.id,
        groupId: viagemGroup!.id,
        role: 'OWNER'
      },
      {
        userId: clientUser.id,
        groupId: viagemGroup!.id,
        role: 'MEMBER'
      }
    ]
  })

  console.log('✅ Membros adicionados aos grupos')

  // Criar categorias para o grupo de viagem
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Alimentação', color: '#FF6B6B', icon: '🍽️', tenantId: tenant.id, groupId: viagemGroup!.id },
      { name: 'Transporte', color: '#4ECDC4', icon: '🚗', tenantId: tenant.id, groupId: viagemGroup!.id },
      { name: 'Hospedagem', color: '#45B7D1', icon: '🏨', tenantId: tenant.id, groupId: viagemGroup!.id },
      { name: 'Entretenimento', color: '#96CEB4', icon: '🎮', tenantId: tenant.id, groupId: viagemGroup!.id },
      { name: 'Outros', color: '#FFEAA7', icon: '📦', tenantId: tenant.id, groupId: viagemGroup!.id }
    ]
  })

  console.log('✅ Categorias criadas')

  // Criar algumas despesas de exemplo
  const expenses = await prisma.expense.createMany({
    data: [
      {
        description: 'Almoço no restaurante',
        amount: 45.50,
        date: new Date('2024-01-15'),
        status: 'CONFIRMED',
        paidById: adminUser.id,
        groupId: viagemGroup!.id,
        categoryId: (await prisma.category.findFirst({ where: { name: 'Alimentação' } }))?.id
      },
      {
        description: 'Uber do aeroporto',
        amount: 32.00,
        date: new Date('2024-01-15'),
        status: 'CONFIRMED',
        paidById: clientUser.id,
        groupId: viagemGroup!.id,
        categoryId: (await prisma.category.findFirst({ where: { name: 'Transporte' } }))?.id
      },
      {
        description: 'Hotel 2 noites',
        amount: 280.00,
        date: new Date('2024-01-15'),
        status: 'CONFIRMED',
        paidById: adminUser.id,
        groupId: viagemGroup!.id,
        categoryId: (await prisma.category.findFirst({ where: { name: 'Hospedagem' } }))?.id
      }
    ]
  })

  console.log('✅ Despesas de exemplo criadas')

  // Criar pagamentos
  const expense1 = await prisma.expense.findFirst({ where: { description: 'Almoço no restaurante' } })
  const expense2 = await prisma.expense.findFirst({ where: { description: 'Uber do aeroporto' } })
  const expense3 = await prisma.expense.findFirst({ where: { description: 'Hotel 2 noites' } })

  if (expense1 && expense2 && expense3) {
    await prisma.payment.createMany({
      data: [
        {
          userId: clientUser.id,
          expenseId: expense1.id,
          amount: 22.75,
          status: 'PAID',
          paidAt: new Date()
        },
        {
          userId: adminUser.id,
          expenseId: expense2.id,
          amount: 16.00,
          status: 'PAID',
          paidAt: new Date()
        },
        {
          userId: clientUser.id,
          expenseId: expense3.id,
          amount: 140.00,
          status: 'PAID',
          paidAt: new Date()
        }
      ]
    })

    console.log('✅ Pagamentos criados')
  }

  console.log('🎉 Seed concluído com sucesso!')
  console.log('\n📋 Dados de acesso:')
  console.log('Admin: admin@finsplit.com / admin123')
  console.log('Cliente: joao@finsplit.com / admin123')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 