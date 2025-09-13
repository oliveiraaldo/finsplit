import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, phone, tenantName, tenantType, planId } = body

    // Validações básicas
    if (!name || !email || !password || !tenantName) {
      return NextResponse.json(
        { message: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este email já está em uso' },
        { status: 400 }
      )
    }

    // Verificar se o telefone já existe
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone }
      })

      if (existingPhone) {
        return NextResponse.json(
          { message: 'Este telefone já está em uso' },
          { status: 400 }
        )
      }
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Buscar configurações do plano selecionado
    let selectedPlan = null
    let planConfig = {
      maxGroups: 1,
      maxMembers: 5,
      maxExports: 10,
      hasWhatsApp: false,
      hasAI: false,
      credits: 0
    }

    if (planId) {
      selectedPlan = await prisma.plan.findUnique({
        where: { id: planId, isActive: true }
      })

      if (selectedPlan) {
        planConfig = {
          maxGroups: selectedPlan.maxGroups,
          maxMembers: selectedPlan.maxMembers,
          maxExports: 10, // Valor padrão, pode ser adicionado ao modelo Plan depois
          hasWhatsApp: selectedPlan.hasWhatsApp,
          hasAI: selectedPlan.hasWhatsApp, // Assumindo que IA vem junto com WhatsApp
          credits: selectedPlan.creditsIncluded
        }
      }
    }

    // Criar tenant e usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          type: tenantType || 'BUSINESS',
          plan: selectedPlan?.price === 0 ? 'FREE' : 'PREMIUM',
          planId: selectedPlan?.id,
          ...planConfig
        }
      })

      // Criar usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'CLIENT',
          tenantId: tenant.id
        }
      })

      // Criar grupo padrão
      const defaultGroup = await tx.group.create({
        data: {
          name: 'Grupo Principal',
          description: 'Grupo padrão criado automaticamente',
          tenantId: tenant.id
        }
      })

      // Adicionar usuário como owner do grupo
      await tx.groupMember.create({
        data: {
          userId: user.id,
          groupId: defaultGroup.id,
          role: 'OWNER'
        }
      })

      // Criar categorias padrão baseadas no tipo de tenant
      const getDefaultCategories = (type: string) => {
        switch (type) {
          case 'BUSINESS':
            return [
              { name: 'Escritório', color: '#FF6B6B', icon: '🏢' },
              { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
              { name: 'Alimentação', color: '#45B7D1', icon: '🍽️' },
              { name: 'Material', color: '#96CEB4', icon: '📦' },
              { name: 'Serviços', color: '#FFEAA7', icon: '🔧' },
              { name: 'Marketing', color: '#DDA0DD', icon: '📢' }
            ]
          case 'FAMILY':
            return [
              { name: 'Supermercado', color: '#FF6B6B', icon: '🛒' },
              { name: 'Contas da Casa', color: '#4ECDC4', icon: '🏠' },
              { name: 'Transporte', color: '#45B7D1', icon: '🚗' },
              { name: 'Saúde', color: '#96CEB4', icon: '🏥' },
              { name: 'Educação', color: '#FFEAA7', icon: '📚' },
              { name: 'Lazer', color: '#DDA0DD', icon: '🎮' }
            ]
          case 'PERSONAL':
            return [
              { name: 'Alimentação', color: '#FF6B6B', icon: '🍽️' },
              { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
              { name: 'Compras', color: '#45B7D1', icon: '🛍️' },
              { name: 'Entretenimento', color: '#96CEB4', icon: '🎮' },
              { name: 'Saúde', color: '#FFEAA7', icon: '💊' },
              { name: 'Outros', color: '#DDA0DD', icon: '📦' }
            ]
          default:
            return [
              { name: 'Alimentação', color: '#FF6B6B', icon: '🍽️' },
              { name: 'Transporte', color: '#4ECDC4', icon: '🚗' },
              { name: 'Outros', color: '#FFEAA7', icon: '📦' }
            ]
        }
      }

      const defaultCategories = getDefaultCategories(tenantType || 'BUSINESS')

      for (const category of defaultCategories) {
        await tx.category.create({
          data: {
            ...category,
            tenantId: tenant.id,
            groupId: defaultGroup.id
          }
        })
      }

      return { user, tenant, group: defaultGroup }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        action: 'USER_SIGNUP',
        entity: 'USER',
        entityId: result.user.id,
        details: { planId, planName: selectedPlan?.name, tenantName, tenantType },
        tenantId: result.tenant.id,
        userId: result.user.id
      }
    })

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role
      }
    })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 