-- =====================================================================
--  KAIROS FROTA — Seeds (opcional)
--
--  IMPORTANTE: o app já popula automaticamente os dados de parametrização
--  (combustíveis, diagramas de rodagem, tipos de equipamento) no PRIMEIRO
--  acesso do administrador, gravando em public.app_state. Portanto, na
--  maioria dos casos você NÃO precisa rodar seeds manualmente.
--
--  Este arquivo serve como referência do conteúdo semeado e permite
--  pré-carregar a parametrização para um org_id específico, se desejar.
--  Substitua :ORG_ID pelo uuid do usuário administrador (auth.users.id).
-- =====================================================================

-- Combustíveis
insert into public.app_state (org_id, domain, value)
values (
  ':ORG_ID', 'fuels',
  '[
    {"id":"fuel-0","nome":"Gasolina Comum","ativo":true},
    {"id":"fuel-1","nome":"Gasolina Aditivada","ativo":true},
    {"id":"fuel-2","nome":"Etanol","ativo":true},
    {"id":"fuel-3","nome":"Diesel S10","ativo":true},
    {"id":"fuel-4","nome":"Diesel S500","ativo":true},
    {"id":"fuel-5","nome":"Biodiesel","ativo":true},
    {"id":"fuel-6","nome":"Arla 32","ativo":true},
    {"id":"fuel-7","nome":"GLP","ativo":true},
    {"id":"fuel-8","nome":"GNV","ativo":true},
    {"id":"fuel-9","nome":"Elétrico","ativo":true},
    {"id":"fuel-10","nome":"Híbrido","ativo":true}
  ]'::jsonb
)
on conflict (org_id, domain) do nothing;

-- Diagramas de rodagem (posições padronizadas: 1E,1D,2EE,2EI,2DI,2DE...)
insert into public.app_state (org_id, domain, value)
values (
  ':ORG_ID', 'diagrams',
  '[
    {"id":"dg-leve","nome":"Veículo leve (4 posições)","semPneus":false,"posicoes":["1E","1D","2E","2D"]},
    {"id":"dg-moto","nome":"Moto (2 posições)","semPneus":false,"posicoes":["1F","2T"]},
    {"id":"dg-tri","nome":"Triciclo (3 posições)","semPneus":false,"posicoes":["1F","2E","2D"]},
    {"id":"dg-truck","nome":"Truck (10 posições)","semPneus":false,"posicoes":["1E","1D","2EE","2EI","2DI","2DE","3EE","3EI","3DI","3DE"]},
    {"id":"dg-esteira","nome":"Equipamento de esteira (sem pneus)","semPneus":true,"posicoes":[]}
  ]'::jsonb
)
on conflict (org_id, domain) do nothing;

-- Tipos de equipamento
insert into public.app_state (org_id, domain, value)
values (
  ':ORG_ID', 'equipTypes',
  '[
    {"id":"et-carro","nome":"Carro","categoria":"emplacado","diagramaId":"dg-leve","usaHorimetro":false},
    {"id":"et-caminhonete","nome":"Caminhonete","categoria":"emplacado","diagramaId":"dg-leve","usaHorimetro":false},
    {"id":"et-van","nome":"Van","categoria":"emplacado","diagramaId":"dg-leve","usaHorimetro":false},
    {"id":"et-caminhao","nome":"Caminhão","categoria":"emplacado","diagramaId":"dg-truck","usaHorimetro":false},
    {"id":"et-onibus","nome":"Ônibus","categoria":"emplacado","diagramaId":"dg-truck","usaHorimetro":false},
    {"id":"et-moto","nome":"Moto","categoria":"emplacado","diagramaId":"dg-moto","usaHorimetro":false},
    {"id":"et-triciclo","nome":"Triciclo","categoria":"emplacado","diagramaId":"dg-tri","usaHorimetro":false},
    {"id":"et-escavadeira","nome":"Escavadeira","categoria":"amarela","diagramaId":"dg-esteira","usaHorimetro":true},
    {"id":"et-pacarreg","nome":"Pá carregadeira","categoria":"amarela","diagramaId":"dg-truck","usaHorimetro":true},
    {"id":"et-motonivel","nome":"Motoniveladora","categoria":"amarela","diagramaId":"dg-truck","usaHorimetro":true},
    {"id":"et-esteira","nome":"Trator de esteira","categoria":"amarela","diagramaId":"dg-esteira","usaHorimetro":true},
    {"id":"et-rolo","nome":"Rolo compactador","categoria":"amarela","diagramaId":"dg-esteira","usaHorimetro":true}
  ]'::jsonb
)
on conflict (org_id, domain) do nothing;
