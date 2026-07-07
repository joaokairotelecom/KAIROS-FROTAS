# Checklist de release — Kairos Frota ERP

## Antes do deploy
- [ ] `.env` configurado (local) e variáveis na Vercel (produção)
- [ ] `supabase/schema.sql` e `supabase/storage.sql` executados no Supabase
- [ ] `npm run build` sem erros
- [ ] Login admin funciona e parametrização inicial foi semeada
- [ ] Cadastro de frota, checklist, abastecimento e IA testados
- [ ] PWA instala no celular (Android/iOS)

## Deploy
- [ ] `git push origin main`
- [ ] Deploy Vercel concluído (URL pública abrindo)
- [ ] `/api/ai` respondendo (testar uma análise de IA)

## Pós-deploy
- [ ] Backup inicial do Supabase
- [ ] (Opcional) app nativo gerado via Capacitor
