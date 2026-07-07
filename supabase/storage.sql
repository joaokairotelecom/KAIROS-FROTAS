-- =====================================================================
--  KAIROS FROTA — Storage (buckets) e policies
--  Execute após o schema.sql.
-- =====================================================================

-- Bucket público para mídia do ERP (fotos de checklist, calibragem,
-- inspeção, evidências de dano, documentos convertidos em imagem).
-- Público de leitura para facilitar exibição; escrita apenas autenticada
-- e restrita à pasta do próprio usuário (org).
insert into storage.buckets (id, name, public)
values ('kairos-media', 'kairos-media', true)
on conflict (id) do nothing;

-- Leitura pública dos objetos do bucket
drop policy if exists "kairos_media_read" on storage.objects;
create policy "kairos_media_read" on storage.objects
  for select using ( bucket_id = 'kairos-media' );

-- Upload apenas por usuários autenticados, dentro da própria pasta (org = auth.uid())
drop policy if exists "kairos_media_insert" on storage.objects;
create policy "kairos_media_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kairos-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Atualização/remoção apenas do próprio conteúdo
drop policy if exists "kairos_media_update" on storage.objects;
create policy "kairos_media_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'kairos-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "kairos_media_delete" on storage.objects;
create policy "kairos_media_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kairos-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
