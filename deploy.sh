#!/bin/bash

echo "🚀 FinSplit - Deploy Automático"
echo "================================"

# Verificar se está no branch main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Erro: Deploy apenas do branch main"
    echo "Branch atual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Erro: Há mudanças não commitadas"
    git status --short
    exit 1
fi

# Verificar se está logado no Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Erro: Não está logado no Vercel"
    echo "Execute: vercel login"
    exit 1
fi

echo "✅ Verificações passaram!"
echo ""

# Build do projeto
echo "🔨 Buildando projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build"
    exit 1
fi

echo "✅ Build concluído!"
echo ""

# Deploy no Vercel
echo "🚀 Fazendo deploy no Vercel..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deploy concluído com sucesso!"
    echo "🌐 URL: https://finsplit.vercel.app"
    echo ""
    echo "📱 Próximos passos:"
    echo "1. Configurar webhook Twilio para nova URL"
    echo "2. Testar integração WhatsApp"
    echo "3. Verificar variáveis de ambiente"
else
    echo "❌ Erro no deploy"
    exit 1
fi 