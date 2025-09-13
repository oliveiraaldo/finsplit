import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''

    const where: any = {}
    if (category) {
      where.category = category
    }

    const settings = await prisma.systemSettings.findMany({
      where,
      include: {
        updatedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    })

    // Agrupar settings por categoria
    const groupedSettings = settings.reduce((acc: any, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }
      acc[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy
      })
      return acc
    }, {})

    return NextResponse.json({
      settings: groupedSettings,
      categories: Object.keys(groupedSettings)
    })

  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const { key, value, category, description, isPublic } = await request.json()

    if (!key || !category) {
      return NextResponse.json(
        { message: 'Chave e categoria são obrigatórias' },
        { status: 400 }
      )
    }

    // Verificar se a configuração já existe
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    })

    let setting
    if (existingSetting) {
      // Atualizar configuração existente
      setting = await prisma.systemSettings.update({
        where: { key },
        data: {
          value,
          category,
          description,
          isPublic: isPublic || false,
          updatedById: session.user.id
        }
      })
    } else {
      // Criar nova configuração
      setting = await prisma.systemSettings.create({
        data: {
          key,
          value,
          category,
          description,
          isPublic: isPublic || false,
          updatedById: session.user.id
        }
      })
    }

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: existingSetting ? 'UPDATE_SETTING' : 'CREATE_SETTING',
        entity: 'SystemSettings',
        entityId: setting.id,
        details: `Configuração ${existingSetting ? 'atualizada' : 'criada'}: ${key} = ${JSON.stringify(value)}`
      }
    })

    return NextResponse.json(setting, { 
      status: existingSetting ? 200 : 201 
    })

  } catch (error) {
    console.error('Erro ao salvar configuração:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Inicializar configurações padrão
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    const defaultSettings = [
      // Configurações Gerais
      {
        key: 'app_name',
        value: 'FinSplit',
        category: 'general',
        description: 'Nome da aplicação',
        isPublic: true
      },
      {
        key: 'app_description',
        value: 'Sistema de divisão de despesas',
        category: 'general',
        description: 'Descrição da aplicação',
        isPublic: true
      },
      {
        key: 'maintenance_mode',
        value: false,
        category: 'general',
        description: 'Modo de manutenção ativo',
        isPublic: false
      },
      {
        key: 'max_file_size_mb',
        value: 10,
        category: 'general',
        description: 'Tamanho máximo de arquivo em MB',
        isPublic: false
      },
      
      // Integrações
      {
        key: 'twilio_enabled',
        value: true,
        category: 'integrations',
        description: 'Integração com Twilio WhatsApp habilitada',
        isPublic: false
      },
      {
        key: 'openai_enabled',
        value: true,
        category: 'integrations',
        description: 'Integração com OpenAI habilitada',
        isPublic: false
      },
      {
        key: 'ai_extraction_cost_credits',
        value: 1,
        category: 'integrations',
        description: 'Custo em créditos por extração de IA',
        isPublic: false
      },
      
      // Segurança
      {
        key: 'password_min_length',
        value: 8,
        category: 'security',
        description: 'Tamanho mínimo da senha',
        isPublic: false
      },
      {
        key: 'session_timeout_hours',
        value: 24,
        category: 'security',
        description: 'Timeout da sessão em horas',
        isPublic: false
      },
      {
        key: 'max_login_attempts',
        value: 5,
        category: 'security',
        description: 'Máximo de tentativas de login',
        isPublic: false
      },
      
      // Notificações
      {
        key: 'email_notifications_enabled',
        value: true,
        category: 'notifications',
        description: 'Notificações por email habilitadas',
        isPublic: false
      },
      {
        key: 'whatsapp_notifications_enabled',
        value: true,
        category: 'notifications',
        description: 'Notificações por WhatsApp habilitadas',
        isPublic: false
      },
      
      // Limites
      {
        key: 'default_free_plan_groups',
        value: 1,
        category: 'limits',
        description: 'Número padrão de grupos no plano gratuito',
        isPublic: false
      },
      {
        key: 'default_free_plan_members',
        value: 5,
        category: 'limits',
        description: 'Número padrão de membros no plano gratuito',
        isPublic: false
      }
    ]

    const results = []
    for (const settingData of defaultSettings) {
      const existing = await prisma.systemSettings.findUnique({
        where: { key: settingData.key }
      })

      if (!existing) {
        const setting = await prisma.systemSettings.create({
          data: {
            ...settingData,
            updatedById: session.user.id
          }
        })
        results.push(setting)
      }
    }

    // Log de auditoria
    if (results.length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          action: 'INITIALIZE_SETTINGS',
          entity: 'SystemSettings',
          details: `Inicializadas ${results.length} configurações padrão`
        }
      })
    }

    return NextResponse.json({
      message: `${results.length} configurações inicializadas`,
      settings: results
    })

  } catch (error) {
    console.error('Erro ao inicializar configurações:', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
