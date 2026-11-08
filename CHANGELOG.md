# Changelog

## 2.1.0 — Catálogo de pneus relacionado (Marca → Modelo → Medida)
- **Cadastro de Marca** (nome, código auxiliar, logotipo) com lista pesquisável.
- **Cadastro de Modelo** vinculado obrigatoriamente a uma marca (desenho, qtd. de sulcos, sulco novo em mm, código). Não salva sem marca; modelo único por marca.
- **Cadastro de Medida** padronizada (maiúsculas) e reutilizável entre marcas/modelos, sem duplicidade.
- **Cadastro de pneu em cascata**: seleciona a marca → modelos filtrados por ela → medida; botão "+" inline cria marca/modelo/medida sem perder o formulário e já seleciona o item criado.
- Admin › Pneus: telas de Marcas, Modelos e Medidas (também no grupo Pneus do menu).
- Supabase: `supabase/catalogo-pneus.sql` com tabelas relacionais (FK marca→modelo, RLS, índices, view). O app segue usando jsonb (domínios tireBrands/tireModels/tireSizes); as tabelas são opcionais para SQL/BI.
- Proteções: não remove marca/modelo com vínculos; medida padronizada evita duplicados.
- Testes: build de produção OK; 15 render-tests + 7 testes relacionais — todos passaram.

## 2.0.0 — Módulo de Pneus profissional (padrão Prolog) + auditoria
Reconstrução do módulo de pneus inspirada nos relatórios do Prolog (Makro Engenharia):
- **Ciclo de vidas** do pneu (1ª, 2ª, 3ª…) com custo e KM por vida + histórico de vidas encerradas.
- **Sulcos por posição** (interno, centro int., centro ext., externo) e menor sulco; MM novo/inicial.
- **CPK** (custo por km) da vida atual e acumulado; valor acumulado (aquisição + bandas).
- **Movimentações** (domínio `tiremoves`): montagem, rodízio, recapagem, desmontagem e descarte, com origem→destino, posição, motivo, KM e responsável.
- **Previsão de troca**: KM/mm, mm restante até o sulco mínimo e KM a rodar.
- **Descarte** com motivo, aparência, fotos e CPK final acumulado.
- **Ficha completa do pneu** com KPIs, sulcos, vidas anteriores e histórico.
- Integração: **Inspeção** grava sulcos no pneu aplicado; **Calibragem** grava pressão atual; **IA de diagnóstico** cruza sulco interno×externo, pressão×ideal e CPK.
- Relatório de Pneus enriquecido (vida, menor sulco, CPK).

### Auditoria e correções
- Rodapé reflete corretamente Supabase (nuvem) vs. armazenamento local.
- Unidade/Contrato e Regional reincluídos no cadastro (aba Operação) — alinhados aos filtros de relatório e à operação multiunidade da Makro (AMP, Parauapebas).
- Número de fogo com validação de duplicidade.
- Posições de pneu seguem o diagrama de rodagem da frota (sem lista fixa).

### Testes executados neste build
- Build de produção (bundle + minify) sem erros.
- 16 render-tests (componentes novos + regressão) — todos OK.
- 9 testes de cálculo (CPK, km/vida, mm, previsão) — todos OK.

## 1.0.0 — Projeto profissional (Vite + Supabase + PWA)
- Migração de arquivo único para projeto Vite estruturado (src/lib + App).
- Persistência em Supabase (tabela app_state, RLS, storage) com fallback local.
- Recursos de IA via função serverless segura (/api/ai) — chave protegida no servidor.
- PWA instalável (manifest, service worker, ícones, splash, offline shell).
- Configuração de deploy Vercel (vercel.json) e empacotamento móvel (Capacitor).
- Documentação completa: README, SUPABASE, DEPLOY, MOBILE.

### Funcionalidades do ERP (herdadas e mantidas)
- Cadastro de frotas em abas, com OCR de CRLV.
- Checklist diário (medidor de combustível, danos no diagrama, fotos).
- Abastecimento, custos, manutenções, ordens de serviço, documentação com histórico.
- Pneus: cadastro/estoque, calibragem e inspeção de sulcos.
- Parametrização: combustíveis, diagramas de rodagem, tipos de equipamento.
- Alertas inteligentes configuráveis; gerente virtual (IA); relatórios PDF/CSV.
- Perfis e matriz de permissões; auditoria; central de ajuda.
