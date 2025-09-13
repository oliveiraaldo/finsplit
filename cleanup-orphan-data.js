require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupOrphanData() {
  try {
    console.log('🧹 INICIANDO LIMPEZA DE DADOS ÓRFÃOS...\n')

    // 1. Encontrar tenants sem usuários
    const tenantsWithoutUsers = await prisma.tenant.findMany({
      where: {
        users: {
          none: {}
        }
      },
      include: {
        groups: {
          include: {
            members: true,
            expenses: true
          }
        },
        _count: {
          select: {
            users: true,
            groups: true
          }
        }
      }
    })

    console.log(`🔍 Encontrados ${tenantsWithoutUsers.length} tenants órfãos (sem usuários):\n`)

    for (const tenant of tenantsWithoutUsers) {
      console.log(`📋 TENANT: ${tenant.name} (ID: ${tenant.id})`)
      console.log(`   👥 Usuários: ${tenant._count.users}`)
      console.log(`   📁 Grupos: ${tenant._count.groups}`)
      
      let totalExpenses = 0
      for (const group of tenant.groups) {
        totalExpenses += group.expenses.length
        console.log(`   - Grupo: ${group.name} (${group.members.length} membros, ${group.expenses.length} despesas)`)
      }
      console.log(`   💰 Total de despesas: ${totalExpenses}`)
      console.log('')
    }

    // 2. Encontrar grupos sem membros
    const groupsWithoutMembers = await prisma.group.findMany({
      where: {
        members: {
          none: {}
        }
      },
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            expenses: true,
            members: true
          }
        }
      }
    })

    console.log(`🔍 Encontrados ${groupsWithoutMembers.length} grupos órfãos (sem membros):\n`)

    for (const group of groupsWithoutMembers) {
      console.log(`📁 GRUPO: ${group.name} (ID: ${group.id})`)
      console.log(`   🏢 Tenant: ${group.tenant.name}`)
      console.log(`   👥 Membros: ${group._count.members}`)
      console.log(`   💰 Despesas: ${group._count.expenses}`)
      console.log('')
    }

    // Perguntar se deve prosseguir com a limpeza
    console.log('⚠️  ATENÇÃO: Esta operação irá excluir permanentemente:')
    console.log(`   - ${tenantsWithoutUsers.length} tenants órfãos`)
    console.log(`   - ${groupsWithoutMembers.length} grupos órfãos`)
    console.log(`   - Todas as despesas e dados relacionados`)
    console.log('')
    console.log('💡 Para prosseguir, execute: node cleanup-orphan-data.js --confirm')
    
    // Verificar se foi passado o parâmetro --confirm
    if (process.argv.includes('--confirm')) {
      console.log('\n🚀 INICIANDO LIMPEZA...\n')

      let deletedCount = 0

      // Limpar grupos órfãos primeiro
      for (const group of groupsWithoutMembers) {
        console.log(`🗑️  Excluindo grupo órfão: ${group.name}`)
        
        await prisma.$transaction(async (tx) => {
          // Excluir pagamentos das despesas
          await tx.payment.deleteMany({
            where: {
              expense: {
                groupId: group.id
              }
            }
          })

          // Excluir despesas
          await tx.expense.deleteMany({
            where: {
              groupId: group.id
            }
          })

          // Excluir o grupo
          await tx.group.delete({
            where: { id: group.id }
          })
        })

        deletedCount++
      }

      // Limpar tenants órfãos
      for (const tenant of tenantsWithoutUsers) {
        console.log(`🗑️  Excluindo tenant órfão: ${tenant.name}`)
        
        await prisma.$transaction(async (tx) => {
          // Excluir todos os grupos e dados relacionados
          for (const group of tenant.groups) {
            // Excluir pagamentos
            await tx.payment.deleteMany({
              where: {
                expense: {
                  groupId: group.id
                }
              }
            })

            // Excluir despesas
            await tx.expense.deleteMany({
              where: {
                groupId: group.id
              }
            })

            // Excluir membros do grupo
            await tx.groupMember.deleteMany({
              where: {
                groupId: group.id
              }
            })

            // Excluir grupo
            await tx.group.delete({
              where: { id: group.id }
            })
          }

          // Excluir categorias do tenant
          await tx.category.deleteMany({
            where: {
              tenantId: tenant.id
            }
          })

          // Excluir arquivos do tenant
          await tx.uploadedFile.deleteMany({
            where: {
              tenantId: tenant.id
            }
          })

          // Excluir logs de auditoria
          await tx.auditLog.deleteMany({
            where: {
              tenantId: tenant.id
            }
          })

          // Excluir transações de crédito
          await tx.creditTransaction.deleteMany({
            where: {
              tenantId: tenant.id
            }
          })

          // Excluir o tenant
          await tx.tenant.delete({
            where: { id: tenant.id }
          })
        })

        deletedCount++
      }

      console.log(`\n✅ LIMPEZA CONCLUÍDA!`)
      console.log(`   🗑️  ${deletedCount} registros excluídos`)
      console.log(`   🧹 Dados órfãos removidos com sucesso`)

    } else {
      console.log('\n❌ Limpeza cancelada. Use --confirm para prosseguir.')
    }

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanData()
