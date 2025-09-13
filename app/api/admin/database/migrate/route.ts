import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 })
    }

    console.log('🔧 Iniciando migração manual da tabela system_settings...')
    
    // Criar tabela system_settings se não existir
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" JSONB NOT NULL,
        "category" TEXT NOT NULL,
        "description" TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedById" TEXT,
        
        CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "system_settings_key_key" UNIQUE ("key")
      );
    `

    // Tentar adicionar foreign key se não existir
    try {
      await prisma.$executeRaw`
        ALTER TABLE "system_settings" 
        ADD CONSTRAINT "system_settings_updatedById_fkey" 
        FOREIGN KEY ("updatedById") REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `
    } catch (e) {
      console.log('⚠️  Foreign key já existe:', e)
    }

    // Inicializar configurações padrão
    const defaultSettings = [
      { key: 'app_name', value: 'FinSplit', category: 'general', description: 'Nome da aplicação', isPublic: true },
      { key: 'app_description', value: 'Sistema de divisão de despesas', category: 'general', description: 'Descrição da aplicação', isPublic: true },
      { key: 'maintenance_mode', value: false, category: 'general', description: 'Modo de manutenção ativo', isPublic: false },
      { key: 'max_file_size_mb', value: 10, category: 'general', description: 'Tamanho máximo de arquivo em MB', isPublic: false },
      
      { key: 'twilio_enabled', value: true, category: 'integrations', description: 'Integração com Twilio WhatsApp habilitada', isPublic: false },
      { key: 'openai_enabled', value: true, category: 'integrations', description: 'Integração com OpenAI habilitada', isPublic: false },
      { key: 'ai_extraction_cost_credits', value: 1, category: 'integrations', description: 'Custo em créditos por extração de IA', isPublic: false },
      
      { key: 'password_min_length', value: 8, category: 'security', description: 'Tamanho mínimo da senha', isPublic: false },
      { key: 'session_timeout_hours', value: 24, category: 'security', description: 'Timeout da sessão em horas', isPublic: false },
      { key: 'max_login_attempts', value: 5, category: 'security', description: 'Máximo de tentativas de login', isPublic: false },
      
      { key: 'email_notifications_enabled', value: true, category: 'notifications', description: 'Notificações por email habilitadas', isPublic: false },
      { key: 'whatsapp_notifications_enabled', value: true, category: 'notifications', description: 'Notificações por WhatsApp habilitadas', isPublic: false },
      
      { key: 'default_free_plan_groups', value: 1, category: 'limits', description: 'Número padrão de grupos no plano gratuito', isPublic: false },
      { key: 'default_free_plan_members', value: 5, category: 'limits', description: 'Número padrão de membros no plano gratuito', isPublic: false }
    ]

    const results = []
    for (const settingData of defaultSettings) {
      try {
        const setting = await prisma.systemSettings.create({
          data: {
            id: `setting_${settingData.key}`,
            ...settingData,
            updatedById: session.user.id
          }
        })
        results.push(setting)
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.log(`⚠️  Configuração ${settingData.key} já existe`)
        } else {
          throw e
        }
      }
    }

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        action: 'DATABASE_MIGRATION',
        entity: 'SystemSettings',
        details: `Tabela system_settings criada e ${results.length} configurações inicializadas`
      }
    })

    return NextResponse.json({
      message: `Migração concluída! Tabela criada e ${results.length} configurações inicializadas.`,
      settings: results.length
    })

  } catch (error) {
    console.error('❌ Erro na migração:', error)
    return NextResponse.json(
      { 
        message: 'Erro na migração', 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
