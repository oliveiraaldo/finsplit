import twilio from 'twilio'

let twilioClient: any = null

// Só inicializa o cliente se as credenciais estiverem disponíveis
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  } catch (error) {
    console.warn('Erro ao inicializar cliente Twilio:', error)
  }
}

export { twilioClient as twilio } 