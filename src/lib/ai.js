import { AI_MODEL } from "./supabase";

/*
 * Cliente de IA. As análises (gerente virtual, OCR de CRLV, leitura de manual,
 * diagnóstico de pneus) chamam um endpoint serverless em /api/ai que injeta a
 * chave da Anthropic no servidor (a chave NUNCA vai para o front-end).
 *
 * Em produção na Vercel: crie a função /api/ai.js (incluída em /api) e configure
 * a variável de ambiente ANTHROPIC_API_KEY no painel da Vercel.
 */

export async function askAI(content, expectJson = false) {
  const messages = [{ role: "user", content }];
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1200, messages }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("Falha na IA (" + res.status + "). " + t.slice(0, 140));
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Falha na análise de IA.");
  const text = (data.content || []).map((c) => (c.type === "text" ? c.text : "")).filter(Boolean).join("\n");
  if (!expectJson) return text;
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const m = clean.match(/[\[{][\s\S]*[\]}]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    throw new Error("A IA não retornou dados estruturados. Tente novamente.");
  }
}
