# 🚀 FinSplit - Sistema de Divisão de Despesas

**MVP SaaS completo** para controle e divisão de despesas com integração WhatsApp + IA.

## ✨ Funcionalidades

- 📱 **WhatsApp Integration** via Twilio
- 🤖 **AI Receipt Extraction** via OpenAI GPT-4o
- 👥 **Group Management** com membros e despesas
- 📊 **Real-time Dashboard** com gráficos
- 💰 **Balance Calculation** automático
- 📤 **Export Reports** (CSV, PDF, Excel)
- 🔐 **JWT Authentication** com NextAuth
- 📈 **Admin Panel** completo

## 🏗️ Arquitetura

- **Frontend + API**: Next.js 14 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js (JWT)
- **Messaging**: Twilio WhatsApp
- **AI**: OpenAI GPT-4o Vision
- **Styling**: Tailwind CSS

## 🚀 Deploy Rápido

### 1. **Vercel (Recomendado)**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 2. **Railway**

```bash
# Conectar repositório
# Railway detecta Next.js automaticamente
```

### 3. **Netlify**

```bash
# Build command
npm run build

# Publish directory
.next
```

## 🗄️ Database Setup

### **Opções de Banco:**

1. **Supabase** (Recomendado)
2. **Neon**
3. **PlanetScale**
4. **Railway PostgreSQL**

### **Setup do Banco:**

```bash
# 1. Criar banco PostgreSQL
# 2. Configurar DATABASE_URL no .env
# 3. Executar migrations

npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

## 🔧 Configuração

### **1. Variáveis de Ambiente:**

```bash
# Copiar exemplo
cp env.production.example .env.production

# Configurar com seus valores
```

### **2. Serviços Externos:**

- **Twilio**: WhatsApp Business API
- **OpenAI**: GPT-4o Vision API
- **Mercado Pago**: Pagamentos (futuro)

### **3. Webhooks:**

```bash
# Twilio WhatsApp Webhook
https://seu-dominio.com/api/webhooks/twilio

# Mercado Pago Webhook (futuro)
https://seu-dominio.com/api/webhooks/mercadopago
```

## 📱 WhatsApp Setup

### **1. Twilio Sandbox:**
- Juntar ao sandbox: `join <palavra>`
- Configurar webhook URL
- Testar envio de recibos

### **2. Produção:**
- Solicitar número WhatsApp Business
- Configurar webhook de produção
- Testar integração completa

## 🎯 Próximos Passos

### **Fase 1 (Atual):**
- ✅ MVP básico funcionando
- ✅ WhatsApp + OpenAI integrados
- ✅ Dashboard funcional

### **Fase 2 (Próxima):**
- 💳 **Mercado Pago** integrado
- 📧 **Email notifications**
- 📊 **Charts avançados**
- 🔒 **Planos Free/Premium**

### **Fase 3 (Futuro):**
- 📱 **Mobile App**
- 🔄 **Sync automático**
- 🌍 **Multi-idioma**
- 📈 **Analytics avançados**

## 🚀 Comandos de Deploy

```bash
# Build para produção
npm run build

# Start produção
npm start

# Deploy Vercel
vercel --prod

# Deploy Railway
railway up
```

## 📞 Suporte

- **Email**: suporte@finsplit.com
- **WhatsApp**: +55 (38) 99727-9959
- **Documentação**: [docs.finsplit.com](https://docs.finsplit.com)

---

**🎉 FinSplit - Simplificando suas finanças!** 