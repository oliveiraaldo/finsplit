import jwt from 'jsonwebtoken'

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret'

export interface OnboardingTokenData {
  wa_user_id: string // WhatsApp user ID (phone number)
  user_id?: string   // FinSplit user ID (após criação da conta)
  step: 'started' | 'account_created' | 'group_created' | 'category_created' | 'completed'
  created_at: number
  expires_at: number
}

// Criar token de onboarding (15 minutos)
export function createOnboardingToken(wa_user_id: string): string {
  const now = Date.now()
  const tokenData: OnboardingTokenData = {
    wa_user_id,
    step: 'started',
    created_at: now,
    expires_at: now + (15 * 60 * 1000) // 15 minutos
  }
  
  return jwt.sign(tokenData, SECRET, { expiresIn: '15m' })
}

// Validar e decodificar token
export function validateOnboardingToken(token: string): OnboardingTokenData | null {
  try {
    const decoded = jwt.verify(token, SECRET) as OnboardingTokenData
    
    // Verificar se não expirou
    if (Date.now() > decoded.expires_at) {
      return null
    }
    
    return decoded
  } catch (error) {
    console.error('Token inválido:', error)
    return null
  }
}

// Atualizar token com nova informação
export function updateOnboardingToken(
  currentToken: string, 
  updates: Partial<Pick<OnboardingTokenData, 'user_id' | 'step'>>
): string | null {
  const current = validateOnboardingToken(currentToken)
  if (!current) return null
  
  const updated: OnboardingTokenData = {
    ...current,
    ...updates
  }
  
  return jwt.sign(updated, SECRET, { expiresIn: '15m' })
}

// Gerar texto para WhatsApp com token
export function generateReturnMessage(token: string): string {
  return `Voltei do cadastro ✅ (token: ${token.slice(-8)})`
}

// Extrair token de mensagem WhatsApp
export function extractTokenFromMessage(message: string): string | null {
  const match = message.match(/token:\s*([A-Za-z0-9-_]+\.?[A-Za-z0-9-_]*\.?[A-Za-z0-9-_]*)/i)
  return match ? match[1] : null
}
