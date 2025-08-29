import OpenAI from 'openai'

// Função para obter cliente OpenAI apenas quando necessário
export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Chave OpenAI não configurada')
  }
  
  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  } catch (error) {
    console.warn('Erro ao inicializar cliente OpenAI:', error)
    throw error
  }
}

// Exportar função para compatibilidade
export const openai = {
  chat: {
    completions: {
      create: async (data: any) => {
        const client = getOpenAIClient()
        return client.chat.completions.create(data)
      }
    }
  }
} 