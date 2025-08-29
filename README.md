# FinSplit - Sistema de Controle de Despesas em Grupo

Um SaaS completo para divisão e controle de despesas com integração WhatsApp, inteligência artificial e planos Free/Premium.

## 🚀 Funcionalidades

- **Grupos de Despesas**: Crie grupos para viagens, casa, trabalho ou qualquer ocasião
- **Controle Automático**: Saldos calculados automaticamente para cada membro
- **Integração WhatsApp**: Envie recibos pelo WhatsApp e confirme despesas
- **Inteligência Artificial**: IA extrai dados dos recibos automaticamente
- **Relatórios e Gráficos**: Visualize gastos e tendências com gráficos interativos
- **Planos Flexíveis**: Comece grátis e evolua conforme suas necessidades

## 🏗️ Arquitetura

- **Frontend + API**: Next.js 14 (App Router) monolito
- **Banco de dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: NextAuth.js (JWT)
- **Mensageria**: Twilio WhatsApp
- **IA**: OpenAI GPT-4 Vision
- **Pagamentos**: Mercado Pago

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL
- Conta no Twilio (WhatsApp)
- Conta na OpenAI
- Conta no Mercado Pago

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd finsplit
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/finsplit"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sua-chave-openai-aqui"

# Twilio
TWILIO_ACCOUNT_SID="seu-account-sid-aqui"
TWILIO_AUTH_TOKEN="seu-auth-token-aqui"
TWILIO_PHONE_NUMBER="whatsapp:+14155238886"

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN="seu-access-token-aqui"
MERCADOPAGO_WEBHOOK_SECRET="seu-webhook-secret-aqui"

# JWT
JWT_SECRET="sua-chave-jwt-aqui"
```

4. **Configure o banco de dados**
```bash
# Gere o cliente Prisma
npm run db:generate

# Execute as migrações
npm run db:migrate

# Ou apenas sincronize o schema (desenvolvimento)
npm run db:push
```

5. **Execute o projeto**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:3000`

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas principais:

- **users**: Usuários do sistema
- **tenants**: Organizações/empresas
- **groups**: Grupos de despesas
- **expenses**: Despesas registradas
- **payments**: Pagamentos realizados
- **categories**: Categorias de despesas
- **audit_logs**: Log de auditoria

## 🔌 Integrações

### Twilio WhatsApp
- Webhook para receber mensagens
- Processamento de mídia (recibos)
- Respostas automáticas

### OpenAI
- Extração de dados de recibos
- Análise de imagens com GPT-4 Vision
- Validação de dados extraídos

### Mercado Pago
- Assinaturas recorrentes
- Webhooks para atualizações
- Controle de planos

## 📱 Uso do WhatsApp

1. **Envie uma foto do recibo** para o número configurado
2. **A IA extrai automaticamente** os dados (valor, descrição, data)
3. **Confirme ou rejeite** respondendo "sim" ou "não"
4. **A despesa é registrada** na planilha do grupo

## 💰 Planos e Preços

### Free
- 1 grupo ativo
- Até 5 membros
- Exportação CSV
- Dashboard básico

### Premium (R$ 29,90/mês)
- Grupos ilimitados
- Membros ilimitados
- WhatsApp + IA
- Exportação PDF/Excel
- Gráficos avançados

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outras plataformas
- Netlify
- Railway
- Heroku

## 🔒 Segurança

- Autenticação JWT com cookies httpOnly
- Row Level Security (RLS) no PostgreSQL
- Auditoria completa de todas as operações
- Validação de entrada em todas as APIs

## 📊 Monitoramento

- Logs de auditoria para todas as ações
- Métricas de uso (IA, WhatsApp, exportações)
- Relatórios de consumo por tenant

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

- **Documentação**: [docs.finsplit.com](https://docs.finsplit.com)
- **Email**: suporte@finsplit.com
- **WhatsApp**: +55 11 99999-9999

## 🔮 Roadmap

- [ ] App mobile nativo
- [ ] Integração com bancos
- [ ] Notificações push
- [ ] API pública
- [ ] Marketplace de integrações
- [ ] Múltiplos idiomas

---

**FinSplit** - Simplificando o controle de despesas em grupo 🚀 