import twilio from 'twilio'

// Função para obter cliente Twilio apenas quando necessário
export function getTwilioClient(): any {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Credenciais Twilio não configuradas')
  }
  
  try {
    return twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  } catch (error) {
    console.warn('Erro ao inicializar cliente Twilio:', error)
    throw error
  }
}

// Exportar função para compatibilidade
export const twilioClient = { 
  messages: { 
    create: async (data: any) => {
      const client = getTwilioClient()
      return client.messages.create(data)
    }
  } 
} 