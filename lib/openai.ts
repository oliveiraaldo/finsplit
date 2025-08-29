import OpenAI from 'openai'

let openai: any = null

// Só inicializa o cliente se a chave estiver disponível
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  } catch (error) {
    console.warn('Erro ao inicializar cliente OpenAI:', error)
  }
}

export { openai } 