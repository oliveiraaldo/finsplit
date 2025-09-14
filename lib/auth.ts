import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: 'smtp.resend.com',
        port: 587,
        auth: {
          user: 'resend',
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: process.env.EMAIL_FROM || 'FinSplit <noreply@finsplit.app>',
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        try {
          await resend.emails.send({
            from: provider.from,
            to: identifier,
            subject: '🔑 Seu link de acesso ao FinSplit',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <h1 style="color: #2563eb; margin: 0; font-size: 28px;">FinSplit</h1>
                  <p style="color: #6b7280; margin: 10px 0 0 0;">Controle de despesas inteligente</p>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                  <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">🔑 Acesse sua conta</h2>
                  <p style="color: #4b5563; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                    Clique no botão abaixo para fazer login em sua conta do FinSplit de forma segura:
                  </p>
                  
                  <a href="${url}" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 10px 0;">
                    ✨ Entrar na minha conta
                  </a>
                  
                  <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px;">
                    Este link expira em 24 horas e só pode ser usado uma vez.
                  </p>
                </div>
                
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                  <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                    Se você não solicitou este email, pode ignorá-lo com segurança.
                  </p>
                  <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                    © ${new Date().getFullYear()} FinSplit - Todos os direitos reservados
                  </p>
                </div>
              </div>
            `,
          })
          console.log('✅ Magic link enviado para:', identifier)
        } catch (error) {
          console.error('❌ Erro ao enviar magic link:', error)
          throw error
        }
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 dias (mais seguro)
    updateAge: 24 * 60 * 60, // Atualizar a cada 24 horas
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // Para login com credentials
        if (account?.provider === 'credentials') {
          token.role = user.role
          token.tenantId = user.tenantId
          token.tenant = user.tenant
        }
        // Para login com magic link (email)
        else if (account?.provider === 'email') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { tenant: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.tenantId = dbUser.tenantId
            token.tenant = dbUser.tenant
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.tenantId = token.tenantId as string
        session.user.tenant = token.tenant as any
      }
      return session
    },
    async signIn({ user, account, email }) {
      // Para magic link, verificar se usuário existe
      if (account?.provider === 'email') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })
        
        // Só permitir login via magic link se usuário já existir
        if (!existingUser) {
          console.log('❌ Tentativa de magic link para email não cadastrado:', user.email)
          return false
        }
        
        console.log('✅ Magic link autorizado para:', user.email)
        return true
      }
      
      return true
    }
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  secret: process.env.NEXTAUTH_SECRET,
} 