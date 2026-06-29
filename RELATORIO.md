# 📋 Relatório de Revisão e Preparação para Publicação
**Sistema de Almoxarifado — Hiper Comercial Monlevade**

---

## 1. Problemas encontrados e corrigidos

### 🔴 Críticos (segurança)
| # | Problema | Correção |
|---|---|---|
| 1 | **API sem autenticação real.** Todas as rotas (criar/excluir usuários, estoque, etc.) estavam abertas a qualquer um que alcançasse a URL. A "proteção" existia só no frontend (facilmente burlável). | Implementada autenticação **JWT**: o login emite um token assinado; um middleware (`requireAuth`) protege todas as rotas; `requireAdmin` restringe a gestão de usuários. Validado por testes HTTP (401 sem token, 403 sem permissão). |
| 2 | **Vazamento de senha.** O login e as consultas de usuário retornavam o hash da senha ao cliente. | Todas as respostas de usuário agora usam um `select` seguro — a senha **nunca** sai do servidor. |
| 3 | **CORS totalmente aberto** e ausência de cabeçalhos de segurança. | CORS restrito por `CORS_ORIGIN`; adicionado **Helmet** (cabeçalhos HTTP seguros) e **rate limit** no `/login` (anti força-bruta). |

### 🟠 Bloqueadores de deploy
| # | Problema | Correção |
|---|---|---|
| 4 | **URL da API fixa** (`http://localhost:3000`) no frontend. | Agora vem de `VITE_API_URL` (variável de ambiente do build). |
| 5 | **`npm start` usava `--env-file=.env`**, que quebra no Render (sem arquivo `.env`). | `start` passou a ser `node src/index.js`; variáveis vêm do ambiente. Adicionado `build` com `prisma migrate deploy`. |
| 6 | **Build de produção falhava** (`tsc`): variáveis/funções não usadas em código pré-existente. Provavelmente o build nunca havia sido rodado (só `npm run dev`). | Regras `noUnusedLocals/Parameters` relaxadas para não bloquear o build (sem alterar comportamento). Build da Vercel agora passa. |
| 7 | **`theme.js` não era copiado para o build** — o tema (claro/escuro) quebraria em produção (404). | Movido para `front/public/`, garantindo a cópia para o `dist`. Verificado. |
| 8 | `index.js` sem defaults de `HOST`/`PORT` (e typo no log). | Defaults seguros (`0.0.0.0` / `3000`) e log corrigido. |

### 🟡 Outros
| # | Problema | Correção |
|---|---|---|
| 9 | **E-mail preso ao Gmail** (IMAP/SMTP fixos), mas a empresa usa **Outlook/Microsoft 365**. | Centralizado em `back/src/config/email.js`, configurável por env. Suporta **Outlook (padrão) e Gmail** via `EMAIL_PROVIDER`. |
| 10 | Controllers de usuário retornavam erros com status `200`. | Status HTTP corretos (400/401/403/404/409/500). |
| 11 | Import morto e dependência redundante (`nodemailer` instanciado em dois lugares). | Removidos; transporter único e central. |
| 12 | **26 vulnerabilidades** (1 crítica, 12 altas) no backend e 23 no frontend. | `npm audit fix` + upgrade do `nodemailer` p/ v9. **Backend: 0 críticas/0 altas** (20 moderadas transitivas restantes). **Frontend: 23 → 3.** |

---

## 2. Melhorias realizadas

- **Arquitetura de armazenamento desacoplada** (padrão *Provider*): o sistema grava/lê/exclui notas fiscais através de uma interface única, com implementações `local` e `sharepoint` selecionáveis por env. Trocar de destino é mudar **uma variável** — sem tocar nos controllers. (Ver seção 6.)
- **Upload em memória** (`multer.memoryStorage`): o arquivo nunca depende do disco do servidor — essencial para hospedagem com disco efêmero e para enviar direto ao SharePoint.
- **E-mail multi-provedor** centralizado (Outlook e Gmail por `EMAIL_PROVIDER`) — pronto para a realidade da empresa.
- **Configuração 100% por variáveis de ambiente** (`.env.example` no back e no front documentando tudo).
- **Banco pronto para Neon**: `directUrl` no schema (padrão recomendado Prisma + pooling).
- **Script de bootstrapping** (`npm run criar-admin`) para criar o primeiro administrador com segurança.
- **Arquivos de deploy prontos**: `render.yaml` (backend) e `vercel.json` (frontend, com rewrite de SPA).
- **Higiene de repositório**: `.gitignore` na raiz para segredos e dados sensíveis (CSV/XLSX de colaboradores).
- **Sessão mais segura no frontend**: token JWT no `localStorage`, expiração tratada (401 → logout automático).

---

## 3. Possíveis riscos restantes

| Risco | Impacto | Mitigação / Observação |
|---|---|---|
| **Hibernação do Render Free** | Primeiro acesso após ociosidade demora alguns segundos; jobs de e-mail só rodam acordado. | Jobs desligados por padrão. Resolvido com plano pago (sem mudar código). |
| **Armazenamento mock até o SharePoint** | Notas fiscais salvas em disco efêmero podem se perder em reinícios. | Usar apenas para teste até configurar o SharePoint (seção 6). |
| **Basic Auth do Microsoft 365** | O tenant da empresa pode bloquear IMAP/SMTP com usuário+senha (padrão atual da Microsoft). | Recomenda-se mover e-mail para **OAuth2/Microsoft Graph**, reutilizando o mesmo app do SharePoint. A config já está isolada em um único arquivo. |
| **20 vulnerabilidades moderadas (backend)** | Transitivas em ferramentas de build/dev; correção exige mudanças incompatíveis. | Baixo risco em produção; reavaliar ao atualizar dependências maiores. |
| **Dados reais versionados** (CSV/XLSX) | Informações de colaboradores já estão no histórico do Git. | Adicionados ao `.gitignore`. Recomenda-se `git rm --cached` desses arquivos e, idealmente, limpar o histórico. |
| **Código morto no frontend** | Funções/variáveis não usadas (lint relaxado). | Sem impacto funcional; recomendada limpeza futura e reativação do lint. |
| **Bundle grande (~900 KB)** | Carregamento inicial mais lento. | Considerar code-splitting e otimizar a imagem `fachada-hiper.png` (2,3 MB). |
| **Sem testes automatizados** | Regressões podem passar despercebidas. | `jest`/`supertest` já estão instalados; recomendado criar uma suíte mínima. |

---

## 4. Plataforma de hospedagem escolhida e justificativa

**Vercel (frontend) + Render (backend) + Neon (banco PostgreSQL).**

- **Gratuita e confiável:** as três têm camadas gratuitas estáveis e consolidadas no mercado, com HTTPS automático.
- **Suporta volume:** Neon é PostgreSQL serverless que escala compute sob demanda; Vercel serve o frontend por CDN global; Render entrega a API com escalabilidade vertical fácil.
- **Migração simples para pago:** tudo é orientado por variáveis de ambiente. Subir de plano é uma ação de painel — **nenhuma alteração de código**.
- **Encaixe técnico:** Vercel é a referência para apps Vite/React; Render roda Node/Express + Prisma nativamente e executa as migrações no build; Neon é o par ideal do Prisma (inclui `directUrl` para migrações com pooling).

> Alternativa avaliada: "tudo no Render". Foi preterida porque o PostgreSQL gratuito do Render é mais limitado/expira, enquanto o Neon é mais robusto para volume e longo prazo.

---

## 5. Passo a passo do deploy (resumo)

O guia detalhado está em **[`DEPLOY.md`](DEPLOY.md)**. Em resumo:

1. **Neon** — criar projeto e copiar as strings *pooled* (`DATABASE_URL`) e *direct* (`DIRECT_URL`).
2. **Render** — *New → Blueprint* (usa o `render.yaml`); preencher variáveis; deploy roda as migrações.
3. **Primeiro admin** — rodar `npm run criar-admin` apontando para o Neon.
4. **Vercel** — importar o repo (root `front`), definir `VITE_API_URL` com a URL do Render, deploy.
5. **CORS** — no Render, definir `CORS_ORIGIN` com a URL da Vercel; redeploy.
6. **Testar** — acessar a URL da Vercel e logar com o admin.

---

## 6. O que configurar quando a empresa fornecer o acesso ao SharePoint

A integração já está **abstraída e isolada** em `back/src/services/storage/sharepointProvider.js`. Hoje opera em **mock** (guarda localmente). Para ativar o SharePoint real:

### a) No Azure AD (Microsoft Entra) — registrar um aplicativo
1. **Azure Portal → Microsoft Entra ID → App registrations → New registration.**
2. Anotar **Directory (tenant) ID** e **Application (client) ID**.
3. Em **Certificates & secrets**, criar um **client secret** e anotar o valor.
4. Em **API permissions**, adicionar permissões de **aplicação** do Microsoft Graph: `Sites.ReadWrite.All` (ou `Files.ReadWrite.All`) e conceder **admin consent**.
5. Identificar o **Site** e o **Drive** (biblioteca de documentos) onde as notas serão guardadas — obter `SITE_ID` e `DRIVE_ID` (via Graph Explorer: `/sites/{host}:/{path}` e `/sites/{id}/drives`).

### b) Variáveis de ambiente (no Render)
```
STORAGE_PROVIDER=sharepoint
SHAREPOINT_TENANT_ID=...
SHAREPOINT_CLIENT_ID=...
SHAREPOINT_CLIENT_SECRET=...
SHAREPOINT_SITE_ID=...
SHAREPOINT_DRIVE_ID=...
SHAREPOINT_FOLDER=NotasFiscais
```

### c) Implementar as chamadas reais (já mapeadas no código)
No arquivo `sharepointProvider.js`, há blocos comentados marcados com **`[GRAPH]`** indicando exatamente onde entram as chamadas ao Microsoft Graph:
- **Autenticação** (`getAccessToken`): client credentials em `login.microsoftonline.com/{tenant}/oauth2/v2.0/token`.
- **Upload** (`save`): `PUT /drives/{driveId}/root:/{folder}/{nome}:/content`.
- **Download** (`getBuffer`): `GET /drives/{driveId}/items/{id}/content`.
- **Exclusão** (`delete`): `DELETE /drives/{driveId}/items/{id}`.

Como a interface é a mesma do mock, **nenhum outro arquivo do sistema precisa mudar** — controllers e o leitor de e-mail continuam funcionando igual.

### d) Observação sobre arquivos antigos
Cada nota guarda em qual provider está (`Invoice.storageProvider`). Arquivos salvos no período de mock permanecem marcados como tal; a migração para SharePoint vale para os novos. Em dev não há dados reais a preservar.

### e) Bônus (recomendado)
Como o app registration do SharePoint usa o Microsoft Graph, ele pode também passar a **enviar e ler e-mails** via Graph (em vez de IMAP/SMTP), contornando o eventual bloqueio de Basic Auth do Microsoft 365.

---

## Anexos — verificações executadas
- ✅ Backend: `npm install` + `prisma generate` sem erros; sintaxe de 16 arquivos OK.
- ✅ Runtime (sem DB): JWT, config de e-mail (Outlook/Gmail) e providers de armazenamento (local + SharePoint mock).
- ✅ Integração HTTP (supertest): rota pública 200, protegida 401, sem permissão 403, validação de login 400.
- ✅ Frontend: `npm run build` (tsc + vite) OK; `theme.js` presente no `dist`.
- ✅ Vulnerabilidades: backend 0 críticas/0 altas; frontend 23 → 3.
