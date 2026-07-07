# Configuração do Supabase

Passo a passo para recriar o backend do zero em qualquer conta Supabase.

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie um projeto (região mais próxima: *South America (São Paulo)*).
2. Defina uma senha forte para o banco (guarde-a).
3. Aguarde o provisionamento (~2 min).

## 2. Rodar os scripts SQL

No painel do projeto → **SQL Editor** → **New query**, rode **nesta ordem**:

1. **`supabase/schema.sql`** — tabela `app_state`, índices, trigger de `updated_at`, RLS e view de resumo.
2. **`supabase/storage.sql`** — bucket `kairos-media` e policies de storage.
3. **`supabase/seeds.sql`** — *opcional*. O app já popula a parametrização no primeiro acesso; use este script apenas se quiser pré-carregar para um `org_id` específico (substitua `:ORG_ID` pelo `id` do usuário em *Authentication › Users*).

Cada script pode ser executado mais de uma vez sem quebrar (usa `if not exists` / `on conflict`).

## 3. Autenticação

Em **Authentication › Providers**, mantenha **Email** habilitado.

- Para uso simples, crie os usuários em **Authentication › Users › Add user** (email + senha) e distribua as credenciais.
- Cada usuário autenticado recebe um `org_id = auth.uid()`, e a RLS garante que ele só acesse os próprios dados.
- Para **multiempresa** (vários usuários compartilhando a mesma base), troque, nas policies do `schema.sql`, `auth.uid()` por um `org_id` fixo vindo de `auth.jwt() -> user_metadata -> org_id`, e defina esse metadado ao criar cada usuário.

> Observação: o **login interno do app** (perfis Administrador/Gestor/Operacional etc., com a matriz de
> permissões) continua funcionando por cima do Supabase — ele controla o que cada perfil vê dentro do ERP.
> O Supabase Auth define **de quem** são os dados; o login do app define **o que** cada um faz.

## 4. Pegar as chaves

**Project Settings › API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** → `VITE_SUPABASE_ANON_KEY`

Coloque no `.env` (local) e nas *Environment Variables* da Vercel (produção).

## 5. Conferir

- **Table Editor** → deve existir `app_state`.
- **Storage** → deve existir o bucket `kairos-media`.
- **Authentication › Policies** → a tabela `app_state` deve mostrar 4 policies (select/insert/update/delete).

## Backup / restauração

- Backup rápido: **Table Editor › app_state › Export** (CSV) ou `pg_dump` via connection string.
- Restauração: reimporte o CSV ou rode os scripts + restore do dump.
