import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🧪 Teste do webhook Twilio:', new Date().toISOString())
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Webhook Twilio está funcionando',
    url: request.url
  })
}

export async function POST(request: NextRequest) {
  console.log('🧪 Teste POST do webhook Twilio:', new Date().toISOString())
  
  try {
    const body = await request.text()
    console.log('📋 Body recebido:', body)
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Webhook Twilio POST está funcionando',
      bodyReceived: body.substring(0, 200) + (body.length > 200 ? '...' : '')
    })
  } catch (error) {
    console.error('❌ Erro no teste:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: String(error)
    })
  }
}
