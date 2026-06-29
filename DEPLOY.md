# 🚀 Guia de Deploy — Sistema de Almoxarifado

Stack de hospedagem (camadas gratuitas):

| Camada | Plataforma | Por quê |
|---|---|---|
| Banco de dados | **Neon** (PostgreSQL serverless) | Free tier generoso, escala sozinho, upgrade trivial |
| Backend (API) | **Render** (Web Service Node) | Deploy via Git, HTTPS automático, fácil migrar para pago |
| Frontend (site) | **Vercel** | Melhor experiência para apps Vite/React, CDN global |

> Tudo é configurado por **variáveis de ambiente** — migrar para plano pago é só trocar o plano, sem mexer no código.

---

## Pré-requisitos
- Código no **GitHub** (o Render e a Vercel puxam do repositório).
- Contas gratuitas em [neon.tech](https://neon.tech), [render.com](https://render.com) e [vercel.com](https://vercel.com).

---

## 1) Banco de dados — Neon
1. Crie um projeto no Neon (ex: `almoxarifado`).
2. Em **Connection Details**, copie **duas** strings:
   - **Pooled connection** (host com `-pooler`) → será a `DATABASE_URL`.
   - **Direct connection** (sem `-pooler`) → será a `DIRECT_URL`.
3. Garanta que ambas terminem com `?sslmode=require`.

> As migrações do Prisma usam a `DIRECT_URL`; a aplicação em runtime usa a `DATABASE_URL` (com pool).

---

## 2) Backend — Render

### Opção A — Blueprint (recomendada, usa o `render.yaml` do repo)
1. No Render: **New + → Blueprint** e selecione o repositório.
2. O Render lê o `render.yaml` (já configurado: `rootDir: back`, build com `prisma migrate deploy`, start `npm start`, health check em `/`).
3. Preencha as variáveis marcadas (veja a tabela abaixo). O `JWT_SECRET` é gerado automaticamente.

### Opção B — Manual
- **New + → Web Service** → selecione o repo.
- **Root Directory:** `back`
- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command:** `npm start`
- **Health Check Path:** `/`

### Variáveis de ambiente (Render → Environment)
| Variável | Valor |
|---|---|
| `DATABASE_URL` | string **pooled** do Neon |
| `DIRECT_URL` | string **direct** do Neon |
| `JWT_SECRET` | segredo longo e aleatório (Blueprint gera) |
| `JWT_EXPIRES` | `8h` |
| `CORS_ORIGIN` | URL do frontend na Vercel (preencha no passo 4) |
| `STORAGE_PROVIDER` | `sharepoint` (mock até as credenciais) ou `local` |
| `ENABLE_EMAIL_JOBS` | `false` por enquanto |
| `EMAIL_PROVIDER` | `outlook` (ou `gmail` para testes) |
| `EMAIL_*` / `SHAREPOINT_*` | preencher quando disponíveis |

4. Faça o deploy. A URL final será algo como `https://almoxarifado-api.onrender.com`.

---

## 3) Primeiro usuário administrador (bootstrapping)
As rotas de criação de usuário exigem um admin autenticado. Crie o primeiro admin **uma vez**:

No seu computador, com um arquivo `back/.env` apontando a `DATABASE_URL`/`DIRECT_URL` do Neon:
```bash
cd back
npm install
npx prisma migrate deploy        # garante o schema no Neon
ADMIN_LOGIN=admin ADMIN_PASSWORD="UmaSenhaForte123" ADMIN_NAME="Administrador" ADMIN_EMAIL="admin@empresa.com" npm run criar-admin
```
(Alternativa: usar a aba **Shell** do serviço no Render e rodar o mesmo `npm run criar-admin`.)

Depois disso, novos usuários são criados pela tela **/registro** dentro do sistema.

---

## 4) Frontend — Vercel
1. **Add New → Project** → selecione o repositório.
2. **Root Directory:** `front`
3. Framework: **Vite** (detectado). Build: `npm run build`, Output: `dist` (já no `vercel.json`).
4. **Environment Variables:** adicione
   - `VITE_API_URL` = URL do backend no Render (ex: `https://almoxarifado-api.onrender.com`)
5. Deploy. A URL final será algo como `https://almoxarifado.vercel.app`.

---

## 5) Conectar frontend ↔ backend (CORS)
1. Volte ao **Render** → variável `CORS_ORIGIN` = URL exata da Vercel (ex: `https://almoxarifado.vercel.app`).
2. Salve (o Render redeploia).
3. Acesse a URL da Vercel e faça login com o admin criado no passo 3. ✅

---

## Notas importantes do plano gratuito
- **Render Free hiberna** após ~15 min sem acesso (primeiro acesso seguinte demora alguns segundos). Os **jobs de e-mail** (alertas/importação) só rodam com o serviço acordado — por isso ficam **desligados por padrão** (`ENABLE_EMAIL_JOBS=false`). Ao migrar para um plano pago no Render, o serviço fica sempre ativo e basta ligar a variável.
- **Armazenamento de arquivos:** o disco do Render é **efêmero**. Por isso as notas fiscais devem ir para o **SharePoint** (ver `RELATORIO.md`). Enquanto o SharePoint não está configurado, o provider `sharepoint` opera em **mock** (guarda localmente e pode ser perdido em reinícios) — adequado apenas para testes.

## Migração para plano pago (futuro, sem mexer no código)
- **Render:** mudar o plano do Web Service (remove a hibernação).
- **Neon:** subir o plano (mais armazenamento/compute).
- **Vercel:** Pro, se precisar de mais banda/builds.
Nenhuma alteração de código é necessária — apenas planos e variáveis.
