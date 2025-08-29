# 🚀 Instalação Rápida - FinSplit

## ⚡ Passos para executar o projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp env.example .env.local
```

O arquivo já está configurado com seu banco PostgreSQL:
- **Host**: 192.168.31.50
- **Porta**: 5432
- **Usuário**: root
- **Senha**: root
- **Banco**: finsplit

Para outras integrações (OpenAI, Twilio, Mercado Pago), edite o `.env.local` com suas credenciais reais.

### 3. Configurar banco de dados
```bash
# Gerar cliente Prisma
npm run db:generate

# Sincronizar schema (desenvolvimento)
npm run db:push

# OU executar migrações (produção)
npm run db:migrate
```

### 4. Popular banco com dados de exemplo
```bash
npm run db:seed
```

### 5. Executar o projeto
```bash
npm run dev
```

## 🔑 Dados de acesso após o seed

- **Admin**: admin@finsplit.com / admin123
- **Cliente**: joao@finsplit.com / admin123

## 🌐 Acessos

- **Frontend**: http://localhost:3000
- **Prisma Studio**: http://localhost:5555 (execute `npm run db:studio`)

## 📱 Testando WhatsApp

1. Configure o Twilio no `.env.local`
2. Use o número de teste do Twilio
3. Envie fotos de recibos para testar a IA

## 🚨 Problemas comuns

### Erro de módulos não encontrados
```bash
npm install
npm run db:generate
```

### Erro de banco de dados
- Verifique se o PostgreSQL está rodando
- Confirme a string de conexão no `.env.local`

### Erro de autenticação
- Verifique se as chaves do NextAuth estão configuradas
- Execute `npm run db:seed` para criar usuários de teste

## 📞 Suporte

Se encontrar problemas, verifique:
1. Versão do Node.js (18+)
2. PostgreSQL rodando
3. Variáveis de ambiente configuradas
4. Dependências instaladas

---

**FinSplit** - MVP completo e funcional! 🎉 