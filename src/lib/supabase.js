import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anon && !url.includes("SEU-PROJETO"));

// Cliente único da aplicação. Se as variáveis não estiverem configuradas,
// o app opera em modo local (localStorage) para não quebrar em desenvolvimento.
export const supabase = hasSupabase
  ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const AI_MODEL = import.meta.env.VITE_AI_MODEL || "claude-sonnet-4-6";
