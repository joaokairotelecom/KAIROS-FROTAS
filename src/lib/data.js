import { supabase, hasSupabase } from "./supabase";

/*
 * Camada de persistência do Kairos Frota ERP.
 *
 * O app foi desenhado sobre uma API simples de chave/valor por "domínio"
 * (users, vehicles, fuel, ...). Aqui mantemos exatamente essa interface,
 * mas agora com dois backends:
 *
 *   1) Supabase (produção): cada domínio é uma linha na tabela `app_state`
 *      (coluna jsonb `value`), isolada por organização via RLS. Simples,
 *      robusto e reproduzível. As imagens grandes continuam embutidas como
 *      data URL no JSON — para volumes altos, use uploadImage() (bucket).
 *
 *   2) localStorage (offline / dev sem chaves): fallback transparente.
 *
 * A interface pública (load/save) é idêntica à antiga `window.storage`,
 * então nenhum módulo de tela precisou ser reescrito.
 */

const LS_PREFIX = "fk:";
const TABLE = "app_state";

// ---- Fallback local ----
const local = {
  async load(key, fallback) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  async save(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("localStorage cheio/erro:", key, e);
      return false;
    }
  },
};

// ---- Supabase ----
async function currentOrg() {
  const { data } = await supabase.auth.getUser();
  // usamos o id do usuário autenticado como escopo de organização simples.
  // (multi-tenant real: troque por um org_id vindo de user_metadata)
  return data?.user?.id || "public";
}

const remote = {
  async load(key, fallback) {
    try {
      const org = await currentOrg();
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("org_id", org)
        .eq("domain", key)
        .maybeSingle();
      if (error) throw error;
      return data?.value ?? fallback;
    } catch (e) {
      console.warn("Supabase load falhou, usando local:", key, e?.message);
      return local.load(key, fallback);
    }
  },
  async save(key, value) {
    try {
      const org = await currentOrg();
      const { error } = await supabase
        .from(TABLE)
        .upsert({ org_id: org, domain: key, value, updated_at: new Date().toISOString() }, { onConflict: "org_id,domain" });
      if (error) throw error;
      // espelha localmente para acesso offline
      local.save(key, value);
      return true;
    } catch (e) {
      console.error("Supabase save falhou:", key, e?.message);
      return local.save(key, value);
    }
  },
};

export const store = hasSupabase ? remote : local;

// ---- Upload de imagens ao bucket (opcional, para reduzir peso do JSON) ----
export async function uploadImage(dataUrl, folder = "evidencias") {
  if (!hasSupabase || !dataUrl?.startsWith("data:")) return dataUrl;
  try {
    const org = await currentOrg();
    const blob = await (await fetch(dataUrl)).blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${org}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("kairos-media").upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("kairos-media").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("uploadImage falhou, mantendo data URL:", e?.message);
    return dataUrl;
  }
}
