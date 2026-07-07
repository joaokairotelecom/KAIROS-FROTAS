# Deploy: GitHub + Vercel

## 1. Enviar para o GitHub

```bash
cd kairos-frota-erp
git init
git add .
git commit -m "feat: Kairos Frota ERP — projeto inicial (Vite + Supabase + PWA)"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/kairos-frota-erp.git
git push -u origin main
```

> O `.gitignore` já impede o versionamento de `.env`, `node_modules`, `dist` e artefatos nativos.
> **Nunca** faça commit do arquivo `.env` com chaves reais.

## 2. Publicar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (pode usar a conta do GitHub).
2. **Add New… › Project** → importe o repositório `kairos-frota-erp`.
3. A Vercel detecta **Vite** automaticamente:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Em **Environment Variables**, adicione:

   | Nome | Valor | Escopo |
   |------|-------|--------|
   | `VITE_SUPABASE_URL` | URL do seu projeto Supabase | Production/Preview/Development |
   | `VITE_SUPABASE_ANON_KEY` | anon key do Supabase | Production/Preview/Development |
   | `ANTHROPIC_API_KEY` | sua chave da API Anthropic | Production/Preview/Development |

   > As `VITE_*` são públicas (front-end). A `ANTHROPIC_API_KEY` é **secreta** e usada só pela função `/api/ai`.

5. Clique em **Deploy**. Ao final, você recebe a URL pública (ex.: `https://kairos-frota-erp.vercel.app`).

## 3. Deploy pela linha de comando (alternativa)

```bash
npm i -g vercel
vercel            # primeira vez: vincula o projeto e pede as env vars
vercel --prod     # publica em produção
```

## 4. Função de IA

O arquivo `api/ai.js` já é uma **função serverless** da Vercel. Ela recebe o pedido do front-end,
injeta a `ANTHROPIC_API_KEY` (que só existe no servidor) e repassa para a API Anthropic.
Assim a chave nunca é exposta no navegador. Nada a configurar além da variável de ambiente.

## 5. Domínio próprio (opcional)

Em **Settings › Domains** na Vercel, adicione seu domínio (ex.: `frota.kairostelecom.com.br`)
e aponte o DNS conforme as instruções exibidas.

## 6. Atualizações

Cada `git push` na branch `main` dispara um novo deploy automático na Vercel.
O PWA usa `autoUpdate`: os usuários recebem a nova versão ao reabrir o app.
