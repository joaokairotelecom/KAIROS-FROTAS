# Kairos Frota — ERP de Gestão de Frotas

ERP inteligente de gestão de frotas da **Kairos Telecom / Kaironanet Ltda** (Pentecoste/CE).
Aplicação **React + Vite**, instalável como **PWA** e empacotável como app **Android/iOS** via Capacitor,
com backend em **Supabase** e recursos de **IA** (gerente virtual, OCR de CRLV, leitura de manual, diagnóstico de pneus).

---

## Módulos

- **Início** — Dashboard executivo e *Minhas Pendências de Hoje* (tela única por frota).
- **Frotas** — Cadastro (em abas, com OCR de CRLV), Checklist diário, Resumo, Abastecimento, Custos, Manutenções, Ordens de Serviço, Documentação (histórico + OCR) e Histórico Fotográfico.
- **Pneus** — Cadastro/estoque, Calibragens e Inspeções (profundidade de sulco).
- **Relatórios** — Frotas, Pneus, Abastecimento, Custos, Checklist, Manutenções e Calibragens, com filtros e export PDF/CSV.
- **Assistente IA** — Gerente virtual que cruza consumo × calibragem × desgaste × manutenção, e central de Alertas.
- **Administração** — Usuários & Permissões (matriz configurável), Diagramas de rodagem, Combustíveis, Tipos de Equipamento, Configurações (parâmetros de alerta), Central de Ajuda e Auditoria.

---

## Requisitos

- **Node.js 18+** e npm.
- Conta **Supabase** (banco + storage).
- Conta **Vercel** (deploy web + função serverless de IA).
- Chave da **API Anthropic** (para os recursos de IA).
- Para apps móveis: **Android Studio** (Android) e/ou **macOS + Xcode** (iOS).

---

## 1. Rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# edite .env com a URL e a anon key do seu projeto Supabase

# 3. Subir em desenvolvimento
npm run dev
# abre em http://localhost:5173
```

> Sem as variáveis do Supabase, o app roda em **modo local** (localStorage) — útil para testes,
> mas os dados ficam só naquele navegador. Configure o Supabase para uso real/multiusuário.

**Primeiro acesso:** na tela de login, use **"Criar acesso administrador"** → usuário `admin` / senha `admin`
(troque depois em *Administração › Usuários*). O primeiro acesso já popula combustíveis, diagramas e tipos padrão.

---

## 2. Configurar o Supabase

Veja o passo a passo detalhado em [`docs/SUPABASE.md`](docs/SUPABASE.md). Resumo:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → rode, nesta ordem: `supabase/schema.sql`, depois `supabase/storage.sql`.
3. (Opcional) `supabase/seeds.sql` — normalmente desnecessário (o app semeia sozinho).
4. Copie **Project URL** e **anon key** para o `.env` (e para a Vercel).

---

## 3. Publicar na Vercel

Veja [`docs/DEPLOY.md`](docs/DEPLOY.md). Resumo:

1. Suba o repositório no GitHub.
2. Na Vercel: **New Project** → importe o repo (framework detectado: **Vite**).
3. **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `ANTHROPIC_API_KEY` (server).
4. **Deploy**. A função `/api/ai` já acompanha o projeto (proxy seguro da IA).

---

## 4. App móvel (Android / iOS)

Veja [`docs/MOBILE.md`](docs/MOBILE.md). Resumo com **Capacitor**:

```bash
npm run build
npx cap add android      # e/ou: npx cap add ios
npx cap sync
npx cap open android     # gera APK/AAB no Android Studio
npx cap open ios         # gera IPA no Xcode (requer macOS + conta Apple)
```

O app também é **PWA**: instale direto pelo navegador (menu → *Instalar aplicativo* / *Adicionar à tela inicial*).

---

## Estrutura do projeto

```
kairos-frota-erp/
├─ api/                # Função serverless da Vercel (proxy de IA)
│  └─ ai.js
├─ docs/               # Documentação técnica
├─ public/             # Ícones PWA, manifest, favicon, splash
├─ scripts/            # Utilitários (checklist de release)
├─ src/
│  ├─ lib/             # supabase, data (persistência), ai, logo
│  ├─ App.jsx          # Aplicação (todos os módulos)
│  ├─ main.jsx         # Entrypoint React
│  └─ index.css        # Tailwind + base
├─ supabase/           # schema.sql, storage.sql, seeds.sql
├─ capacitor.config.json
├─ vercel.json
├─ vite.config.js
└─ .env.example
```

---

## Segurança

- A chave da Anthropic **nunca** vai para o front-end — fica na função serverless (`ANTHROPIC_API_KEY` na Vercel).
- O acesso ao banco é protegido por **RLS** (cada usuário vê apenas os próprios dados).
- Segredos ficam fora do versionamento (veja `.gitignore` e `.env.example`).

---

© Kairos Telecom / Kaironanet Ltda — Pentecoste/CE.
