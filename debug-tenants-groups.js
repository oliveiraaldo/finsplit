require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugTenantsAndGroups() {
  try {
    console.log('🔍 INVESTIGANDO TENANTS E GRUPOS...\n')

    // Buscar todos os tenants com seus grupos e usuários
    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        groups: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            members: {
              select: {
                id: true,
                role: true,
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        ownedGroups: {
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }
      }
    })

    console.log(`📊 TOTAL DE TENANTS: ${tenants.length}\n`)

    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. 🏢 TENANT: ${tenant.name} (ID: ${tenant.id})`)
      console.log(`   📅 Criado em: ${tenant.createdAt.toLocaleString('pt-BR')}`)
      console.log(`   💳 Créditos: ${tenant.credits}`)
      console.log(`   📋 Plano: ${tenant.plan}`)
      console.log(`   ✅ Status: ${tenant.status}`)
      
      console.log(`   👥 USUÁRIOS (${tenant.users.length}):`)
      tenant.users.forEach(user => {
        console.log(`      - ${user.name} (${user.email}) - ${user.role}`)
      })
      
      console.log(`   📁 GRUPOS PRÓPRIOS (${tenant.groups.length}):`)
      tenant.groups.forEach(group => {
        console.log(`      - ${group.name} (${group.members.length} membros) - ${group.createdAt.toLocaleDateString('pt-BR')}`)
        group.members.forEach(member => {
          console.log(`        * ${member.user.name} (${member.role})`)
        })
      })
      
      console.log(`   🔗 GRUPOS COMO OWNER (${tenant.ownedGroups.length}):`)
      tenant.ownedGroups.forEach(group => {
        console.log(`      - ${group.name} - ${group.createdAt.toLocaleDateString('pt-BR')}`)
      })
      
      console.log('')
    })

    // Verificar grupos órfãos
    const allGroups = await prisma.group.findMany({
      include: {
        tenant: {
          select: {
            name: true
          }
        },
        ownerTenant: {
          select: {
            name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    console.log(`🔍 ANÁLISE DE TODOS OS GRUPOS (${allGroups.length}):\n`)
    
    allGroups.forEach((group, index) => {
      console.log(`${index + 1}. 📁 GRUPO: ${group.name} (ID: ${group.id})`)
      console.log(`   🏢 Tenant: ${group.tenant?.name || 'N/A'}`)
      console.log(`   👑 Owner Tenant: ${group.ownerTenant?.name || 'N/A'}`)
      console.log(`   📅 Criado: ${group.createdAt.toLocaleString('pt-BR')}`)
      console.log(`   👥 Membros (${group.members.length}):`)
      group.members.forEach(member => {
        console.log(`      - ${member.user.name} (${member.user.email}) - ${member.role}`)
      })
      console.log('')
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugTenantsAndGroups()
