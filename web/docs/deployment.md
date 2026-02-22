# 🚀 Guia de Deployment - AiHospitality

## Visão Geral

Este guia detalha como fazer deploy do sistema AiHospitality em diferentes ambientes.

---

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ (ou serviço gerenciado)
- Conta Vercel/Railway/AWS (dependendo da plataforma)

---

## 🌐 Opção 1: Vercel (Recomendado)

### Vantagens
✅ Deploy automático do Git  
✅ Edge functions globais  
✅ SSL grátis  
✅ Preview deploys  

### Passos

#### 1. Preparar Projeto

```bash
# Adicionar ao package.json
"scripts": {
  "build": "prisma generate && next build",
  "postinstall": "prisma generate"
}
```

#### 2. Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Seguir prompts para configurar projeto
```

#### 3. Configurar Banco de Dados

**Opção A: Supabase (Postgres gerenciado)**

1. Criar projeto em [supabase.com](https://supabase.com)
2. Copiar Connection String
3. Adicionar variável no Vercel:

```bash
vercel env add DATABASE_URL
# Cole: postgresql://user:pass@db.supabase.co:5432/postgres
```

**Opção B: Railway**

1. Criar banco em [railway.app](https://railway.app)
2. Copiar DATABASE_URL
3. Adicionar no Vercel

#### 4. Executar Migrations

```bash
# Localmente, conectado ao DB de produção
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Ou via Vercel CLI
vercel env pull
npx prisma migrate deploy
```

#### 5. Seed do Banco (Opcional)

```bash
DATABASE_URL="postgresql://..." node scripts/seed-db.js
```

#### 6. Configurar Variáveis de Ambiente

No painel Vercel (Settings → Environment Variables):

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
LOG_LEVEL=info
```

#### 7. Deploy para Produção

```bash
vercel --prod
```

### URLs Resultantes

- **App:** https://aihospitality.vercel.app
- **API:** https://aihospitality.vercel.app/api/v1
- **Docs:** https://aihospitality.vercel.app/api-docs

---

## 🐳 Opção 2: Docker

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:14-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aihospitality
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    restart: always
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/aihospitality
      NODE_ENV: production
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

### Comandos

```bash
# Build
docker-compose build

# Run
docker-compose up -d

# Logs
docker-compose logs -f app

# Migrations
docker-compose exec app npx prisma migrate deploy

# Seed
docker-compose exec app node scripts/seed-db.js

# Stop
docker-compose down
```

---

## ☁️ Opção 3: AWS (EC2 + RDS)

### 1. Criar RDS PostgreSQL

1. Console AWS → RDS
2. Create database → PostgreSQL 14
3. Template: Production ou Dev/Test
4. Anotar endpoint e credenciais

### 2. Criar EC2

```bash
# Amazon Linux 2
sudo yum update -y
sudo yum install -y nodejs git

# Clone projeto
git clone https://github.com/seu-usuario/aihospitality.git
cd aihospitality/web

# Install
npm ci --only=production

# Build
npm run build

# Migrations
DATABASE_URL="..." npx prisma migrate deploy
```

### 3. PM2 para Process Management

```bash
npm i -g pm2

# Start
pm2 start npm --name "aihospitality" -- start

# Logs
pm2 logs

# Auto-restart on reboot
pm2 startup
pm2 save
```

### 4. Nginx como Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.aihospitality.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Segurança

### Variáveis Sensíveis

**NUNCA commitar:**
- `.env`
- Credenciais do banco
- API keys

**Usar:**
- Variáveis de ambiente da plataforma
- AWS Secrets Manager
- HashiCorp Vault

### SSL/TLS

- **Vercel:** Automático
- **Docker local:** Usar Caddy ou Traefik
- **EC2:** Let's Encrypt + Certbot

### Firewall

```bash
# EC2 Security Group
- Inbound: 80 (HTTP), 443 (HTTPS)
- Outbound: Tudo allow
```

---

## 📊 Monitoramento

### Logs

**Vercel:**
```bash
vercel logs
```

**Docker:**
```bash
docker-compose logs -f
```

**PM2:**
```bash
pm2 logs
pm2 monit
```

### Métricas

- Vercel Analytics (integrado)
- Datadog, New Relic, ou Sentry
- CloudWatch (AWS)

---

## 🔄 CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install
        run: npm ci
      
      - name: Test
        run: npm test
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## ✅ Checklist Pré-Deploy

- [ ] Testes passando (`npm test`)
- [ ] Build local funciona (`npm run build`)
- [ ] Migrações testadas
- [ ] Variáveis de ambiente configuradas
- [ ] SSL configurado
- [ ] Backup do banco configurado
- [ ] Logs estruturados funcionando
- [ ] Monitoramento ativo

---

## 🆘 Troubleshooting

### Erro: "Cannot find module"
```bash
# Regenerar Prisma Client
npx prisma generate
```

### Migrations falham
```bash
# Reset (CUIDADO: deleta dados)
npx prisma migrate reset

# Deploy forçado
npx prisma migrate deploy --skip-seed
```

### Build timeout
```bash
# Aumentar memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 📞 Suporte

- Documentação: [README.md](../README.md)
- Issues: GitHub Issues
- Email: support@aihospitality.com
