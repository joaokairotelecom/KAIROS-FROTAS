# Changelog

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
