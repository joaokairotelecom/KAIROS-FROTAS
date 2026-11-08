import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, Truck, Fuel, Wallet, Wrench, ClipboardList, CircleDot, Sparkles,
  FileText, Bell, Users, History, X, LogIn, LogOut, Plus, Search, AlertTriangle,
  CheckCircle2, Clock, Camera, Trash2, Pencil, Download, Printer, Gauge, KeyRound,
  Menu, ArrowRightLeft, Package, TrendingUp, Loader2, FileUp, Bot, ShieldCheck, Info, ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { store, uploadImage, loadAll } from "./lib/data.js";
import { askAI } from "./lib/ai.js";
import { LOGO } from "./lib/logo.js";
import { supabase, hasSupabase } from "./lib/supabase.js";
import "./index.css";

/* ================= IDENTIDADE KAIROS ================= */

const BRAND = {
  navy: "#16266B", royal: "#2743B0", sky: "#EEF2FB", ink: "#17203A",
  amber: "#D97E00", green: "#0E8A5F", red: "#C22D2D", yellow: "#B48A0A",
};

/* ================= UTILITÁRIOS ================= */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const nowTime = () => new Date().toTimeString().slice(0, 5);
const nowISO = () => new Date().toISOString();
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const fmtBRL = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v, d = 0) => (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const fmtD = (iso) => { if (!iso) return "—"; const p = String(iso).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "—"; };
const fmtDT = (iso) => (iso ? fmtD(iso) + " " + String(iso).slice(11, 16) : "—");
const monthKey = (iso) => String(iso || "").slice(0, 7);
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (mk) => { const p = mk.split("-"); return MESES[+p[1] - 1] + "/" + p[0].slice(2); };
const daysUntil = (iso) => { if (!iso) return null; return Math.ceil((new Date(iso + "T12:00:00") - new Date()) / 86400000); };
const sumBy = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const enc = (s) => { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return "p:" + s; } };
const dec = (s) => { try { return String(s).startsWith("p:") ? String(s).slice(2) : decodeURIComponent(escape(atob(s))); } catch (e) { return ""; } };

/* ================= PERSISTÊNCIA (Supabase + fallback local via ./lib/data) ================= */
const DOMAINS = ["users", "vehicles", "fuel", "costs", "plans", "mrecords", "os", "tires", "wear", "tiremoves", "tireBrands", "tireModels", "tireSizes", "checklists", "damages", "fuels", "equipTypes", "diagrams", "calibrations", "inspections", "audit", "settings"];
const DEF_ALERTCFG = { calibIntervalDias: 15, inspIntervalDias: 30, consumoQuedaPct: 20, custoLimiteMes: 0, diasParado: 15, sulcoMinimo: 1.6, numSulcos: 4, prevKm: 10000, prevHoras: 250, prevDias: 180 };
const EMPTY = { users: [], vehicles: [], fuel: [], costs: [], plans: [], mrecords: [], os: [], tires: [], wear: [], tiremoves: [], tireBrands: [], tireModels: [], tireSizes: [], checklists: [], damages: [], fuels: [], equipTypes: [], diagrams: [], calibrations: [], inspections: [], audit: [], settings: { proxOS: 1, autoOS: true, firstRun: true, permOverrides: {}, alertCfg: DEF_ALERTCFG } };
// Desenhos de banda/piso (lista pré-definida + livre)
const DESENHOS_PNEU = ["Liso", "Misto", "Tração (borrachudo)", "Direcional", "Rib (rodoviário)", "Lug", "All position", "Off-road"];

/* ================= IA (API Anthropic) ================= */
const fileToDataURL = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
async function compressImage(file, maxW = 560, q = 0.6) {
  const url = await fileToDataURL(file);
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const sc = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * sc));
      c.height = Math.max(1, Math.round(img.height * sc));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => res(url);
    img.src = url;
  });
}

/* ================= CATÁLOGOS ================= */
const PERFIS = { admin: "Administrador", gestor: "Gestor", oficina: "Oficina", mecanico: "Técnico de manutenção", operacional: "Operacional", motorista: "Motorista", leitura: "Somente leitura" };
const CAT_CUSTO = ["Combustível", "Oficina", "Peças", "Pneus", "Lavagem", "Seguro", "IPVA", "Licenciamento", "Multas", "Guincho", "Outros"];
const COMBUSTIVEIS = ["Diesel S10", "Diesel S500", "Gasolina", "Etanol", "GNV", "Flex", "Elétrico", "Outro"];
const STATUS_VEIC = { ativo: ["Ativo", "green"], parado: ["Parado", "slate"], manutencao: ["Em manutenção", "amber"], inativo: ["Inativo", "red"] };
const POSICOES = ["1E", "1D", "2EE", "2EI", "2DI", "2DE", "3EE", "3EI", "3DI", "3DE", "4E", "4D", "Estepe 1", "Estepe 2"];
const DESGASTES = { central: "Desgaste central", interno: "Desgaste interno", externo: "Desgaste externo", angular: "Desgaste angular", escamas: "Escamas", serrilhado: "Serrilhado", irregular: "Desgaste irregular" };
const CAUSAS_DESGASTE = {
  central: ["Calibragem excessiva (pressão alta)"],
  interno: ["Alinhamento (convergência)", "Cambagem negativa", "Embuchamento com folga"],
  externo: ["Alinhamento (divergência)", "Cambagem positiva", "Curvas em velocidade"],
  angular: ["Alinhamento", "Componentes de suspensão gastos"],
  escamas: ["Amortecedores gastos", "Balanceamento"],
  serrilhado: ["Balanceamento", "Amortecedores", "Rolamento com folga"],
  irregular: ["Calibragem incorreta", "Excesso de carga", "Suspensão / amortecedores", "Rodízio em atraso"],
};
const PRIORIDADES = { baixa: ["Baixa", "slate"], media: ["Média", "blue"], alta: ["Alta", "amber"], urgente: ["Urgente", "red"] };
const OS_STATUS = { aberta: ["Aberta", "blue"], em_execucao: ["Em execução", "amber"], concluida: ["Concluída", "green"], cancelada: ["Cancelada", "slate"] };
const TIRE_STATUS = { estoque: ["Em estoque", "blue"], em_uso: ["Aplicado", "green"], recapagem: ["Em recapagem", "amber"], analise: ["Em análise", "yellow"], conserto: ["Em conserto", "amber"], sucateado: ["Descartado", "red"] };
// Padrão Prolog: ciclo de vidas do pneu (1ª vida = novo, 2ª+ = recapado)
const VIDAS = { 1: "1ª vida (novo)", 2: "2ª vida", 3: "3ª vida", 4: "4ª vida", 5: "5ª vida" };
const vidaLabel = (n) => VIDAS[n] || (n ? n + "ª vida" : "1ª vida (novo)");
// Sulcos medidos por posição (padrão Prolog)
const SULCOS_POS = [["interno", "Interno"], ["centroInt", "Centro int."], ["centroExt", "Centro ext."], ["externo", "Externo"]];
// Motivos de movimentação
const MOV_MOTIVOS = ["Aplicação (novo)", "Rodízio", "Desgaste", "Recapagem", "Conserto", "Avaria", "Preventiva", "Fim de vida", "Transferência de veículo", "Outro"];
// Estado de aparência do pneu (para desgaste/descarte)
const APARENCIA = ["Bom", "Regular", "Atenção", "Crítico"];
// Motivos de descarte
const DESCARTE_MOTIVOS = ["Fim de vida útil", "Desgaste total", "Avaria irreparável", "Bolha/separação", "Corte/perfuração", "Desgaste irregular severo", "Idade (DOT)", "Outro"];

/* ================= CÁLCULOS DE PNEUS (padrão Prolog) ================= */
// Menor sulco atual a partir dos 4 pontos medidos
function menorSulco(t) {
  const vals = SULCOS_POS.map(([k]) => num(t["sulco_" + k])).filter((x) => x > 0);
  return vals.length ? Math.min(...vals) : null;
}
function sulcoMedio(t) {
  const vals = SULCOS_POS.map(([k]) => num(t["sulco_" + k])).filter((x) => x > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
// KM rodado na vida atual (desde a montagem, somado ao acumulado da vida)
function kmVidaAtual(t, vmap) {
  let km = num(t.kmVida);
  if (t.status === "em_uso" && t.veiculoId) { const v = vmap[t.veiculoId]; if (v) km += Math.max(0, num(v.kmAtual) - num(t.kmMontagem)); }
  return km;
}
// KM acumulado em todas as vidas
function kmAcumuladoTotal(t, vmap) {
  const vidasAnt = (t.historicoVidas || []).reduce((a, h) => a + num(h.km), 0);
  return vidasAnt + kmVidaAtual(t, vmap);
}
// Valor total investido (aquisição + todas as bandas/recapagens)
function valorAcumulado(t) {
  const bandas = (t.historicoVidas || []).reduce((a, h) => a + num(h.valorBanda), 0) + num(t.valorBanda);
  return num(t.valor) + bandas;
}
// CPK (custo por km) da vida atual e acumulado
function cpkVidaAtual(t, vmap) { const km = kmVidaAtual(t, vmap); const custo = num(t.vida) > 1 ? num(t.valorBanda) : num(t.valor); return km > 0 && custo > 0 ? custo / km : 0; }
function cpkAcumulado(t, vmap) { const km = kmAcumuladoTotal(t, vmap); const v = valorAcumulado(t); return km > 0 && v > 0 ? v / km : 0; }
// Desgaste em mm e km/mm (quanto o pneu roda por mm de sulco gasto)
function mmGasto(t) { const ini = num(t.mmInicial) || num(t.mmNovo); const atual = menorSulco(t); return ini > 0 && atual != null ? Math.max(0, ini - atual) : null; }
function kmPorMm(t, vmap) { const mm = mmGasto(t); const km = kmVidaAtual(t, vmap); return mm > 0 && km > 0 ? km / mm : null; }
// Previsão de troca: com base no desgaste até o sulco mínimo
function previsaoTroca(t, vmap, sulcoMin = 1.6) {
  const atual = menorSulco(t); const kmmm = kmPorMm(t, vmap);
  if (atual == null || !kmmm || atual <= sulcoMin) return { kmRestante: 0, mmRestante: 0, prazo: atual != null && atual <= sulcoMin ? "Trocar agora" : null };
  const mmRest = atual - sulcoMin; const kmRest = mmRest * kmmm;
  return { kmRestante: Math.round(kmRest), mmRestante: +mmRest.toFixed(1), prazo: null };
}

/* ================= SEEDS PARAMETRIZÁVEIS (ERP) ================= */
const SEED_FUELS = ["Gasolina Comum", "Gasolina Aditivada", "Etanol", "Diesel S10", "Diesel S500", "Biodiesel", "Arla 32", "GLP", "GNV", "Elétrico", "Híbrido"].map((n, i) => ({ id: "fuel-" + i, nome: n, ativo: true }));
// Diagramas de rodagem: posições padronizadas por eixo (nunca OE/OD/TE/TD)
const SEED_DIAGRAMS = [
  { id: "dg-leve", nome: "Veículo leve (4 posições)", semPneus: false, posicoes: ["1E", "1D", "2E", "2D"] },
  { id: "dg-moto", nome: "Moto (2 posições)", semPneus: false, posicoes: ["1F", "2T"] },
  { id: "dg-tri", nome: "Triciclo (3 posições)", semPneus: false, posicoes: ["1F", "2E", "2D"] },
  { id: "dg-truck", nome: "Truck (10 posições)", semPneus: false, posicoes: ["1E", "1D", "2EE", "2EI", "2DI", "2DE", "3EE", "3EI", "3DI", "3DE"] },
  { id: "dg-esteira", nome: "Equipamento de esteira (sem pneus)", semPneus: true, posicoes: [] },
];
const SEED_EQUIPTYPES = [
  { id: "et-carro", nome: "Carro", categoria: "emplacado", diagramaId: "dg-leve", usaHorimetro: false },
  { id: "et-caminhonete", nome: "Caminhonete", categoria: "emplacado", diagramaId: "dg-leve", usaHorimetro: false },
  { id: "et-van", nome: "Van", categoria: "emplacado", diagramaId: "dg-leve", usaHorimetro: false },
  { id: "et-caminhao", nome: "Caminhão", categoria: "emplacado", diagramaId: "dg-truck", usaHorimetro: false },
  { id: "et-onibus", nome: "Ônibus", categoria: "emplacado", diagramaId: "dg-truck", usaHorimetro: false },
  { id: "et-moto", nome: "Moto", categoria: "emplacado", diagramaId: "dg-moto", usaHorimetro: false },
  { id: "et-triciclo", nome: "Triciclo", categoria: "emplacado", diagramaId: "dg-tri", usaHorimetro: false },
  { id: "et-escavadeira", nome: "Escavadeira", categoria: "amarela", diagramaId: "dg-esteira", usaHorimetro: true },
  { id: "et-pacarreg", nome: "Pá carregadeira", categoria: "amarela", diagramaId: "dg-truck", usaHorimetro: true },
  { id: "et-motonivel", nome: "Motoniveladora", categoria: "amarela", diagramaId: "dg-truck", usaHorimetro: true },
  { id: "et-esteira", nome: "Trator de esteira", categoria: "amarela", diagramaId: "dg-esteira", usaHorimetro: true },
  { id: "et-rolo", nome: "Rolo compactador", categoria: "amarela", diagramaId: "dg-esteira", usaHorimetro: true },
];
const seedErp = () => ({ fuels: SEED_FUELS.map((x) => ({ ...x })), diagrams: SEED_DIAGRAMS.map((x) => ({ ...x })), equipTypes: SEED_EQUIPTYPES.map((x) => ({ ...x })) });

const NIVEL_MEDIDOR = [["vazio", "Vazio", 0], ["um_quarto", "1/4", 25], ["meio", "1/2", 50], ["tres_quartos", "3/4", 75], ["cheio", "Cheio", 100]];
const DOC_TIPOS = ["CRLV", "Documento da máquina", "Nota Fiscal", "Manual", "Seguro", "Outros"];

/* ================= CHECKLIST / DANOS ================= */
const CHECK_ITENS = [
  "Pneus em boas condições", "Calibragem visual adequada", "Vazamento de óleo", "Vazamento de combustível",
  "Vazamento de fluido hidráulico", "Retrovisores", "Para-brisa", "Limpadores", "Luzes", "Lanternas",
  "Setas", "Buzina", "Cinto de segurança", "Extintor", "Triângulo", "Macaco", "Chave de roda",
  "Documentação", "Limpeza geral",
];
const CHECK_EST = { conforme: ["Conforme", "green"], nc: ["Não conforme", "red"], na: ["Não se aplica", "slate"] };
const VIEWS_VEIC = { frente: "Frente", traseira: "Traseira", lat_esq: "Lateral esquerda", lat_dir: "Lateral direita", superior: "Superior" };
const TIPOS_DANO = ["Arranhão", "Amassado", "Vazamento", "Quebra", "Peça danificada", "Trinca", "Ferrugem", "Outro"];

/* ================= COR DE STATUS DA MANUTENÇÃO ================= */
// Retorna nível de cor para um plano: verde / amarelo / laranja / vermelho
function planColor(p, v) {
  if (!v || v.status === "inativo" || p.ativo === false) return null;
  let worst = 4; // 4 verde, 3 amarelo, 2 laranja, 1 vermelho
  const consider = (rest, thresholds) => {
    if (rest === null) return;
    let lvl = 4;
    if (rest <= 0) lvl = 1;
    else if (rest <= thresholds[0]) lvl = 1;
    else if (rest <= thresholds[1]) lvl = 2;
    else if (rest <= thresholds[2]) lvl = 3;
    worst = Math.min(worst, lvl);
  };
  if (num(p.intervaloKm) > 0) consider(num(p.ultimaKm) + num(p.intervaloKm) - num(v.kmAtual), [500, 2000, 5000]);
  if (num(p.intervaloHoras) > 0 && v.usaHorimetro) consider(num(p.ultimaHoras) + num(p.intervaloHoras) - num(v.horimetro), [25, 50, 100]);
  if (num(p.intervaloMeses) > 0 && p.ultimaData) {
    const alvo = new Date(p.ultimaData + "T12:00:00"); alvo.setMonth(alvo.getMonth() + Math.round(num(p.intervaloMeses)));
    consider(Math.ceil((alvo - new Date()) / 86400000), [7, 15, 30]);
  }
  return worst;
}
const PLAN_COLORS = { 4: ["🟢", "Dentro do prazo", BRAND.green, "green"], 3: ["🟡", "Próxima", "#B48A0A", "yellow"], 2: ["🟠", "Atenção", BRAND.amber, "amber"], 1: ["🔴", "Vencida", BRAND.red, "red"] };

/* ================= PERMISSÕES ================= */
const ALLP = Object.keys(PERFIS);
const CAN = {
  dash: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"] },
  veiculos: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"], edit: ["admin", "gestor"] },
  checklist: { view: ["admin", "gestor", "oficina", "mecanico", "operacional", "motorista", "leitura"], edit: ["admin", "gestor", "oficina", "mecanico", "operacional", "motorista"] },
  resumo: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"] },
  abast: { view: ["admin", "gestor", "motorista", "operacional", "oficina", "leitura"], edit: ["admin", "gestor", "motorista", "operacional"] },
  custos: { view: ["admin", "gestor", "leitura"], edit: ["admin", "gestor"] },
  manut: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"], edit: ["admin", "gestor", "oficina", "mecanico"] },
  os: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"], edit: ["admin", "gestor", "oficina", "mecanico"] },
  pneus: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"], edit: ["admin", "gestor", "oficina", "mecanico"] },
  timeline: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"] },
  ia: { view: ["admin", "gestor"] },
  rel: { view: ["admin", "gestor", "leitura"] },
  notif: { view: ["admin", "gestor", "oficina", "mecanico", "leitura"] },
  users: { view: ["admin"], edit: ["admin"] },
  audit: { view: ["admin", "gestor"] },
};
// Perfil "admin" sempre tem acesso total; overrides configuráveis em Usuários › Permissões.
let PERM_OVERRIDES = {};
const setPermOverrides = (o) => { PERM_OVERRIDES = o || {}; };
const can = (user, mod, action = "view") => {
  if (!user) return false;
  if (user.perfil === "admin") return true;
  const ov = PERM_OVERRIDES[user.perfil] && PERM_OVERRIDES[user.perfil][mod];
  if (ov && typeof ov[action] === "boolean") return ov[action];
  return (CAN[mod] && CAN[mod][action] || []).includes(user.perfil);
};
// Módulos que aparecem na matriz de permissões
const PERM_MODULES = [
  ["dash", "Dashboard"], ["veiculos", "Frotas"], ["checklist", "Checklist"], ["resumo", "Resumo checklists"],
  ["abast", "Abastecimento"], ["custos", "Custos"], ["manut", "Manutenção"], ["os", "Ordens de Serviço"],
  ["pneus", "Pneus / Calibragem / Inspeção"], ["timeline", "Histórico fotográfico"], ["ia", "Assistente IA"], ["rel", "Relatórios"],
  ["notif", "Notificações"], ["audit", "Auditoria"],
];

/* ================= CÁLCULOS DE COMBUSTÍVEL ================= */
function fuelStats(fuel, vehicles) {
  const vmap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
  const groups = {};
  fuel.forEach((f) => { (groups[f.veiculoId] = groups[f.veiculoId] || []).push(f); });
  const enriched = {}; const medias = {};
  Object.entries(groups).forEach(([vid, arr]) => {
    const s = [...arr].sort((a, b) => num(a.km) - num(b.km) || String(a.data || "").localeCompare(String(b.data || "")));
    let prev = null; const kmls = [];
    s.forEach((f) => {
      const e = { kml: null, flags: [] };
      const v = vmap[vid];
      if (prev) {
        const dist = num(f.km) - num(prev.km);
        if (dist <= 0) e.flags.push("KM igual ou menor que o abastecimento anterior — possível erro de digitação");
        else if (num(f.litros) > 0) { e.kml = dist / num(f.litros); kmls.push(e.kml); }
      }
      if (v && num(v.capacidadeTanque) > 0 && num(f.litros) > num(v.capacidadeTanque)) e.flags.push("Litros acima da capacidade do tanque — abastecimento suspeito");
      enriched[f.id] = e; prev = f;
    });
    const media = kmls.length ? kmls.reduce((a, b) => a + b, 0) / kmls.length : null;
    medias[vid] = media;
    s.forEach((f) => {
      const e = enriched[f.id];
      if (e.kml && media && kmls.length >= 3) {
        if (e.kml < media * 0.72) e.flags.push("Consumo bem acima da média do veículo (km/l baixo)");
        else if (e.kml > media * 1.5) e.flags.push("Rendimento fora do padrão — verificar registro");
      }
    });
  });
  return { enriched, medias };
}
const allCostRows = (data) => [
  ...data.costs.map((c) => ({ data: c.data, veiculoId: c.veiculoId, categoria: c.categoria, valor: num(c.valor), motorista: c.motorista || "", desc: c.descricao || "" })),
  ...data.fuel.map((f) => ({ data: f.data, veiculoId: f.veiculoId, categoria: "Combustível", valor: num(f.valorTotal), motorista: f.motorista || "", desc: "Abastecimento " + fmtN(f.litros, 1) + " L" })),
];
const tireKm = (t, vmap) => {
  // Compatível com dados antigos (kmAcumulado) e novos (kmVida + historicoVidas)
  if (t.historicoVidas !== undefined || t.kmVida !== undefined) return kmAcumuladoTotal(t, vmap);
  let km = num(t.kmAcumulado);
  if (t.status === "em_uso" && t.veiculoId) { const v = vmap[t.veiculoId]; if (v) km += Math.max(0, num(v.kmAtual) - num(t.kmMontagem)); }
  return km;
};

/* ================= MOTOR DE ALERTAS ================= */
const NIVEIS = {
  critico: { label: "Crítico", rail: BRAND.red, chip: "red", ord: 0 },
  alto: { label: "Alto", rail: BRAND.amber, chip: "amber", ord: 1 },
  medio: { label: "Médio", rail: BRAND.yellow, chip: "yellow", ord: 2 },
  info: { label: "Informativo", rail: BRAND.royal, chip: "blue", ord: 3 },
};
function buildAlerts(data) {
  const A = [];
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const vname = (id) => { const v = vmap[id]; return v ? v.prefixo + (v.placa ? " · " + v.placa : "") : "veículo removido"; };

  data.plans.filter((p) => p.ativo !== false).forEach((p) => {
    const v = vmap[p.veiculoId];
    if (!v || v.status === "inativo") return;
    if (num(p.intervaloKm) > 0) {
      const alvo = num(p.ultimaKm) + num(p.intervaloKm);
      const rest = alvo - num(v.kmAtual);
      let hit = null;
      if (rest <= 0) hit = ["critico", "VENCIDA", "Vencida há " + fmtN(-rest) + " km (previsto: " + fmtN(alvo) + " km)"];
      else if (rest <= 500) hit = ["critico", "500 KM", "Faltam " + fmtN(rest) + " km"];
      else if (rest <= 1000) hit = ["alto", "1.000 KM", "Faltam " + fmtN(rest) + " km"];
      else if (rest <= 2000) hit = ["alto", "2.000 KM", "Faltam " + fmtN(rest) + " km"];
      else if (rest <= 5000) hit = ["medio", "5.000 KM", "Faltam " + fmtN(rest) + " km"];
      else if (rest <= 10000) hit = ["info", "10.000 KM", "Faltam " + fmtN(rest) + " km"];
      if (hit) A.push({ id: "pkm:" + p.id, kind: "preventiva", nivel: hit[0], tag: hit[1], titulo: p.item + " — " + vname(v.id), detalhe: hit[2], veiculoId: v.id, planoId: p.id });
    }
    if (num(p.intervaloHoras) > 0 && v.usaHorimetro) {
      const alvo = num(p.ultimaHoras) + num(p.intervaloHoras);
      const rest = alvo - num(v.horimetro);
      let hit = null;
      if (rest <= 0) hit = ["critico", "VENCIDA", "Vencida há " + fmtN(-rest) + " h (previsto: " + fmtN(alvo) + " h)"];
      else if (rest <= 25) hit = ["alto", "25 H", "Faltam " + fmtN(rest) + " h"];
      else if (rest <= 50) hit = ["medio", "50 H", "Faltam " + fmtN(rest) + " h"];
      else if (rest <= 100) hit = ["info", "100 H", "Faltam " + fmtN(rest) + " h"];
      if (hit) A.push({ id: "phr:" + p.id, kind: "preventiva", nivel: hit[0], tag: hit[1], titulo: p.item + " (horímetro) — " + vname(v.id), detalhe: hit[2], veiculoId: v.id, planoId: p.id });
    }
    if (num(p.intervaloMeses) > 0 && p.ultimaData) {
      const alvoD = new Date(p.ultimaData + "T12:00:00");
      alvoD.setMonth(alvoD.getMonth() + Math.round(num(p.intervaloMeses)));
      const rest = Math.ceil((alvoD - new Date()) / 86400000);
      let hit = null;
      if (rest <= 0) hit = ["critico", "VENCIDA", "Vencida há " + Math.abs(rest) + " dia(s)"];
      else if (rest <= 15) hit = ["alto", rest + " DIAS", "Vence em " + rest + " dia(s)"];
      else if (rest <= 30) hit = ["medio", "30 DIAS", "Vence em " + rest + " dia(s)"];
      if (hit) A.push({ id: "ptm:" + p.id, kind: "preventiva", nivel: hit[0], tag: hit[1], titulo: p.item + " (por tempo) — " + vname(v.id), detalhe: hit[2], veiculoId: v.id, planoId: p.id });
    }
  });

  data.vehicles.filter((v) => v.status !== "inativo").forEach((v) => {
    [["seguroVenc", "Seguro"], ["ipvaVenc", "IPVA"], ["licVenc", "Licenciamento"]].forEach(([k, label]) => {
      const d = daysUntil(v[k]); if (d === null) return;
      if (d < 0) A.push({ id: "doc:" + k + v.id, kind: "doc", nivel: "critico", tag: "VENCIDO", titulo: label + " vencido — " + vname(v.id), detalhe: "Venceu em " + fmtD(v[k]), veiculoId: v.id });
      else if (d <= 30) A.push({ id: "doc:" + k + v.id, kind: "doc", nivel: d <= 7 ? "alto" : "medio", tag: d + " DIAS", titulo: label + " vence em breve — " + vname(v.id), detalhe: "Vence em " + fmtD(v[k]), veiculoId: v.id });
    });
    (v.docs || []).forEach((doc) => {
      const d = daysUntil(doc.validade); if (d === null) return;
      if (d < 0) A.push({ id: "docx:" + doc.id, kind: "doc", nivel: "alto", tag: "VENCIDO", titulo: "Documento \"" + doc.nome + "\" vencido — " + vname(v.id), detalhe: "Venceu em " + fmtD(doc.validade), veiculoId: v.id });
      else if (d <= 30) A.push({ id: "docx:" + doc.id, kind: "doc", nivel: "medio", tag: d + " DIAS", titulo: "Documento \"" + doc.nome + "\" vence em breve — " + vname(v.id), detalhe: "Vence em " + fmtD(doc.validade), veiculoId: v.id });
    });
  });

  const vmapT = vmap;
  data.tires.filter((t) => t.status !== "sucateado").forEach((t) => {
    if (num(t.vidaUtilKm) > 0) {
      const rodado = tireKm(t, vmapT);
      const rest = num(t.vidaUtilKm) - rodado;
      if (rest <= 0) A.push({ id: "tir:" + t.id, kind: "pneu", nivel: "critico", tag: "TROCAR", titulo: "Pneu fogo " + t.numeroFogo + " — vida útil esgotada", detalhe: fmtN(rodado) + " km rodados de " + fmtN(t.vidaUtilKm) + " km previstos", veiculoId: t.veiculoId });
      else if (rest <= 5000) A.push({ id: "tir:" + t.id, kind: "pneu", nivel: "alto", tag: "5.000 KM", titulo: "Pneu fogo " + t.numeroFogo + " próximo da troca", detalhe: "Restam ~" + fmtN(rest) + " km de vida útil", veiculoId: t.veiculoId });
      else if (rest <= 10000) A.push({ id: "tir:" + t.id, kind: "pneu", nivel: "medio", tag: "10.000 KM", titulo: "Pneu fogo " + t.numeroFogo + " — planejar troca", detalhe: "Restam ~" + fmtN(rest) + " km de vida útil", veiculoId: t.veiculoId });
    }
  });
  const cut60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const latestWear = {};
  data.wear.forEach((w) => { if (!latestWear[w.pneuId] || w.data > latestWear[w.pneuId].data) latestWear[w.pneuId] = w; });
  Object.values(latestWear).forEach((w) => {
    if (w.data >= cut60 && (w.tipos || []).length) {
      const t = data.tires.find((x) => x.id === w.pneuId);
      if (t && t.status === "em_uso") A.push({ id: "wear:" + w.id, kind: "pneu", nivel: "alto", tag: "DESGASTE", titulo: "Desgaste irregular — pneu fogo " + t.numeroFogo, detalhe: (w.tipos || []).map((x) => DESGASTES[x]).join(", ") + (t.veiculoId ? " · " + vname(t.veiculoId) + " pos. " + (t.posicao || "?") : ""), veiculoId: t.veiculoId });
    }
  });

  const { enriched } = fuelStats(data.fuel, data.vehicles);
  const lastFuelByV = {};
  data.fuel.forEach((f) => { if (!lastFuelByV[f.veiculoId] || num(f.km) > num(lastFuelByV[f.veiculoId].km)) lastFuelByV[f.veiculoId] = f; });
  Object.values(lastFuelByV).forEach((f) => {
    const e = enriched[f.id];
    if (e && e.flags.length) A.push({ id: "fuel:" + f.id, kind: "consumo", nivel: "alto", tag: "CONSUMO", titulo: "Abastecimento fora do padrão — " + vname(f.veiculoId), detalhe: e.flags[0] + " (" + fmtD(f.data) + ")", veiculoId: f.veiculoId });
  });
  data.vehicles.filter((v) => v.status === "ativo").forEach((v) => {
    const last = lastFuelByV[v.id];
    if (data.fuel.length && last) {
      const d = Math.floor((new Date() - new Date(last.data + "T12:00:00")) / 86400000);
      if (d >= 30) A.push({ id: "nofuel:" + v.id, kind: "consumo", nivel: "info", tag: d + " DIAS", titulo: "Sem abastecimento há " + d + " dias — " + vname(v.id), detalhe: "Último registro em " + fmtD(last.data), veiculoId: v.id });
    }
  });

  /* --- Calibragem, inspeção (configuráveis) --- */
  const cfg = { ...DEF_ALERTCFG, ...((data.settings && data.settings.alertCfg) || {}) };
  const lastCalib = {}; (data.calibrations || []).forEach((c) => { if (!lastCalib[c.veiculoId] || c.data > lastCalib[c.veiculoId].data) lastCalib[c.veiculoId] = c; });
  const lastInsp = {}; (data.inspections || []).forEach((c) => { if (!lastInsp[c.veiculoId] || c.data > lastInsp[c.veiculoId].data) lastInsp[c.veiculoId] = c; });
  data.vehicles.filter((v) => v.status !== "inativo").forEach((v) => {
    const semPneus = diagramOf(v, data)?.semPneus;
    if (semPneus) return;
    const interv = num(v.calibIntervalDias) || cfg.calibIntervalDias;
    const lc = lastCalib[v.id];
    const rest = lc ? interv - Math.floor((new Date() - new Date(lc.data + "T12:00:00")) / 86400000) : -1;
    if (!lc) A.push({ id: "cal:" + v.id, kind: "calibragem", nivel: "medio", tag: "SEM REGISTRO", titulo: "Calibragem nunca registrada — " + vname(v.id), detalhe: "Registre a primeira calibragem", veiculoId: v.id });
    else if (rest < 0) A.push({ id: "cal:" + v.id, kind: "calibragem", nivel: "alto", tag: "VENCIDA", titulo: "Calibragem vencida — " + vname(v.id), detalhe: "Vencida há " + Math.abs(rest) + " dia(s) · última em " + fmtD(lc.data), veiculoId: v.id });
    else if (rest <= 3) A.push({ id: "cal:" + v.id, kind: "calibragem", nivel: "medio", tag: rest + " DIAS", titulo: "Calibragem próxima — " + vname(v.id), detalhe: "Faltam " + rest + " dia(s)", veiculoId: v.id });

    const intervI = num(v.inspIntervalDias) || cfg.inspIntervalDias;
    const li = lastInsp[v.id];
    const restI = li ? intervI - Math.floor((new Date() - new Date(li.data + "T12:00:00")) / 86400000) : -1;
    if (li && restI < 0) A.push({ id: "insp:" + v.id, kind: "inspecao", nivel: "medio", tag: "VENCIDA", titulo: "Inspeção de pneus vencida — " + vname(v.id), detalhe: "Vencida há " + Math.abs(restI) + " dia(s)", veiculoId: v.id });
    else if (li && restI <= 5) A.push({ id: "insp:" + v.id, kind: "inspecao", nivel: "info", tag: restI + " DIAS", titulo: "Inspeção de pneus próxima — " + vname(v.id), detalhe: "Faltam " + restI + " dia(s)", veiculoId: v.id });
  });
  // sulco mínimo por inspeção
  Object.values(lastInsp).forEach((ins) => {
    const minS = Math.min(...(ins.medicoes || []).flatMap((m) => (m.sulcos || []).map(num)).filter((x) => x > 0), 99);
    if (minS < cfg.sulcoMinimo) A.push({ id: "sulco:" + ins.id, kind: "inspecao", nivel: "alto", tag: "SULCO", titulo: "Sulco abaixo do mínimo — " + vname(ins.veiculoId), detalhe: "Menor sulco: " + fmtN(minS, 1) + " mm (mínimo " + cfg.sulcoMinimo + " mm)", veiculoId: ins.veiculoId });
  });
  // CNH de motoristas/operacionais
  (data.users || []).filter((u) => u.ativo !== false && u.cnhVenc).forEach((u) => {
    const d = daysUntil(u.cnhVenc);
    if (d < 0) A.push({ id: "cnh:" + u.id, kind: "doc", nivel: "alto", tag: "CNH VENCIDA", titulo: "CNH vencida — " + u.nome, detalhe: "Venceu em " + fmtD(u.cnhVenc), userId: u.id });
    else if (d <= 30) A.push({ id: "cnh:" + u.id, kind: "doc", nivel: "medio", tag: d + " DIAS", titulo: "CNH vence em breve — " + u.nome, detalhe: "Vence em " + fmtD(u.cnhVenc), userId: u.id });
  });
  // checklist diário pendente (não feito hoje)
  const hoje = todayISO();
  data.vehicles.filter((v) => v.status === "ativo").forEach((v) => {
    const feitoHoje = (data.checklists || []).some((c) => c.veiculoId === v.id && c.data === hoje);
    if (!feitoHoje) A.push({ id: "chk:" + v.id, kind: "checklist", nivel: "info", tag: "HOJE", titulo: "Checklist diário pendente — " + vname(v.id), detalhe: "Nenhum checklist registrado hoje", veiculoId: v.id });
  });

  return A.sort((a, b) => NIVEIS[a.nivel].ord - NIVEIS[b.nivel].ord);
}
// diagrama efetivo de um veículo
function diagramOf(v, data) {
  if (!v) return null;
  if (v.diagramaId) { const d = (data.diagrams || []).find((x) => x.id === v.diagramaId); if (d) return d; }
  const et = (data.equipTypes || []).find((x) => x.id === v.tipoEquipamentoId);
  if (et) return (data.diagrams || []).find((x) => x.id === et.diagramaId) || null;
  return null;
}
function posicoesDe(v, data) { const d = diagramOf(v, data); return d && !d.semPneus ? d.posicoes : []; }

/* ================= EXPORTAÇÃO ================= */
const toCSV = (cols, rows) => {
  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  return [cols.map((c) => esc(c.label)).join(";"), ...rows.map((r) => cols.map((c) => esc(c.csv ? c.csv(r) : r[c.k])).join(";"))].join("\n");
};
const downloadFile = (name, content, type) => {
  const blob = new Blob(["\uFEFF" + content], { type: type || "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
};

/* ================= UI BÁSICA ================= */
const TONES = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-800 border-blue-200",
  yellow: "bg-yellow-50 text-yellow-800 border-yellow-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  navy: "bg-indigo-50 text-indigo-900 border-indigo-200",
};
const Badge = ({ tone = "slate", children }) => (
  <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap " + TONES[tone]}>{children}</span>
);
const Btn = ({ v = "pri", sm, className = "", style, ...p }) => {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed " + (sm ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm");
  const map = {
    pri: "text-white hover:opacity-90",
    sec: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50",
    dan: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return <button className={base + " " + map[v] + " " + className} style={v === "pri" ? { background: BRAND.royal, ...style } : style} {...p} />;
};
const Field = ({ label, req, span = 1, children, hint }) => (
  <label className={"block " + (span === 2 ? "sm:col-span-2 " : "") + (span === 3 ? "sm:col-span-3 " : "")}>
    <span className="block text-xs font-semibold text-slate-600 mb-1">{label}{req && <span className="text-red-500"> *</span>}</span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
  </label>
);
const inpCls = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-slate-900";
const Inp = (props) => <input className={inpCls} {...props} />;
const Sel = ({ children, ...p }) => <select className={inpCls} {...p}>{children}</select>;
const TA = (props) => <textarea className={inpCls} rows={3} {...props} />;
const Modal = ({ title, sub, onClose, children, footer, w = "max-w-2xl" }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 sm:p-4" onClick={onClose}>
    <div className={"bg-white w-full " + w + " max-h-[93vh] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl"} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
        <div className="min-w-0">
          <h3 className="font-extrabold text-slate-900 leading-tight" style={{ fontFamily: "Archivo, Inter, sans-serif" }}>{title}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0"><X size={18} /></button>
      </div>
      <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-slate-200 flex flex-wrap justify-end gap-2 bg-slate-50 sm:rounded-b-2xl">{footer}</div>}
    </div>
  </div>
);
const AutoForm = ({ schema, val, set, lists = {} }) => (
  <div className="grid sm:grid-cols-2 gap-3">
    {schema.map((f) => {
      if (f.show && !f.show(val)) return null;
      const v = val[f.k] ?? "";
      const on = (e) => set({ ...val, [f.k]: f.type === "check" ? e.target.checked : e.target.value });
      return (
        <Field key={f.k} label={f.label} req={f.req} span={f.span} hint={f.hint}>
          {f.type === "select" ? (
            <Sel value={v} onChange={on}>
              <option value="">Selecione…</option>
              {(f.opts || []).map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
            </Sel>
          ) : f.type === "textarea" ? <TA value={v} onChange={on} />
          : f.type === "check" ? (
            <label className="flex items-center gap-2 py-2.5 cursor-pointer">
              <input type="checkbox" checked={!!val[f.k]} onChange={on} className="w-4 h-4" />
              <span className="text-sm text-slate-700">{f.chkLabel || "Sim"}</span>
            </label>
          ) : f.type === "datalist" ? (
            <>
              <Inp list={"dl-" + f.k} value={v} onChange={on} placeholder={f.ph} />
              <datalist id={"dl-" + f.k}>{(lists[f.k] || f.opts || []).map((o) => <option key={o} value={o} />)}</datalist>
            </>
          ) : <Inp type={f.type || "text"} step={f.step} value={v} onChange={on} placeholder={f.ph} />}
        </Field>
      );
    })}
  </div>
);
const DataTable = ({ cols, rows, onRow, empty = "Nenhum registro encontrado." }) => (
  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
    <table className="w-full text-sm" style={{ minWidth: 620 }}>
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
          {cols.map((c) => <th key={c.k || c.label} className={"px-3 py-2.5 font-bold " + (c.right ? "text-right" : "")}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-slate-400 text-sm">{empty}</td></tr>}
        {rows.map((r) => (
          <tr key={r.id} onClick={onRow ? () => onRow(r) : undefined} className={"border-b border-slate-100 last:border-0 " + (onRow ? "cursor-pointer hover:bg-blue-50/70" : "")}>
            {cols.map((c) => <td key={c.k || c.label} className={"px-3 py-2.5 align-middle " + (c.right ? "text-right " : "") + (c.cls || "")} style={{ fontVariantNumeric: "tabular-nums" }}>{c.render ? c.render(r) : (r[c.k] ?? "—")}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const KPI = ({ icon: Icon, label, value, sub, tone = "royal" }) => {
  const rail = { navy: BRAND.navy, green: BRAND.green, amber: BRAND.amber, red: BRAND.red, royal: BRAND.royal }[tone];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex gap-3 items-start relative overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: rail }} />
      <div className="p-2 rounded-lg shrink-0" style={{ background: BRAND.sky, color: rail }}>{Icon && <Icon size={18} />}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{label}</p>
        <p className="text-lg font-extrabold text-slate-900 leading-tight" style={{ fontVariantNumeric: "tabular-nums", fontFamily: "Archivo, Inter, sans-serif" }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
};
const PageHead = ({ title, sub, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
    <div>
      <h2 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: "Archivo, Inter, sans-serif" }}>{title}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
    <div className="flex gap-2 flex-wrap">{actions}</div>
  </div>
);
const Empty = ({ icon: Icon, title, sub, children }) => (
  <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
    {Icon && <Icon size={30} className="mx-auto text-slate-300 mb-2" />}
    <p className="font-bold text-slate-700">{title}</p>
    {sub && <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{sub}</p>}
    {children && <div className="mt-4 flex justify-center gap-2 flex-wrap">{children}</div>}
  </div>
);
const AlertCard = ({ a, onOS, canOS }) => (
  <div className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-4 pr-3 py-3 flex items-start gap-2">
    <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: NIVEIS[a.nivel].rail }} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge tone={NIVEIS[a.nivel].chip}>{a.tag || NIVEIS[a.nivel].label}</Badge>
        <span className="text-sm font-bold text-slate-900">{a.titulo}</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{a.detalhe}</p>
    </div>
    {a.kind === "preventiva" && canOS && <Btn sm v="sec" onClick={() => onOS(a)}><Wrench size={13} /> Gerar OS</Btn>}
  </div>
);
const Tabs = ({ tabs, cur, set }) => (
  <div className="flex gap-1 mb-4 overflow-x-auto pb-0.5">
    {tabs.map(([id, label]) => (
      <button key={id} onClick={() => set(id)} className={"px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors " + (cur === id ? "text-white" : "text-slate-600 hover:bg-slate-200/70")} style={cur === id ? { background: BRAND.navy } : {}}>
        {label}
      </button>
    ))}
  </div>
);
const Spin = ({ label }) => (
  <span className="inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" /> {label || "Processando…"}</span>
);

/* ---- Fotos ---- */
const Lightbox = ({ src, onClose }) => (
  <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={onClose}>
    <button className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={26} /></button>
    <img src={src} alt="" className="max-w-full max-h-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
  </div>
);
function PhotoInput({ label = "Adicionar foto", photos = [], onChange, max = 6, maxW = 640, q = 0.55 }) {
  const ref = useRef(); const [busy, setBusy] = useState(false); const [zoom, setZoom] = useState(null);
  const add = async (files) => {
    setBusy(true);
    const arr = [...photos];
    for (const f of Array.from(files).slice(0, max - arr.length)) { try { arr.push(await compressImage(f, maxW, q)); } catch (e) {} }
    onChange(arr); setBusy(false); if (ref.current) ref.current.value = "";
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-300 group">
            <img src={p} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setZoom(p)} />
            <button onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"><X size={11} /></button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-400 hover:border-blue-400 hover:text-blue-500">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
          </button>
        )}
      </div>
      <span className="block text-[11px] text-slate-400 mt-1">{label} · {photos.length}/{max}</span>
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => e.target.files.length && add(e.target.files)} />
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
const PhotoStrip = ({ photos = [], onZoom, size = 14 }) => (
  <div className="flex flex-wrap gap-1.5">
    {photos.map((p, i) => <img key={i} src={p} alt="" onClick={() => onZoom(p)} className="rounded-md object-cover cursor-zoom-in border border-slate-200" style={{ width: size * 4, height: size * 4 }} />)}
  </div>
);

/* ---- Diagrama interativo do veículo (marcação de danos) ---- */
function VehicleDiagram({ view, marks = [], onAdd, readOnly }) {
  const wrapRef = useRef();
  const click = (e) => {
    if (readOnly || !onAdd) return;
    const r = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    onAdd({ x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) });
  };
  const here = marks.filter((m) => m.view === view);
  return (
    <div ref={wrapRef} onClick={click} className={"relative w-full rounded-xl border border-slate-300 bg-slate-50 overflow-hidden " + (readOnly ? "" : "cursor-crosshair")} style={{ aspectRatio: "16/9" }}>
      <svg viewBox="0 0 320 180" className="w-full h-full" style={{ pointerEvents: "none" }}>{CAR_SVG[view] || CAR_SVG.superior}</svg>
      {here.map((m, i) => (
        <div key={i} title={m.tipo} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: m.x + "%", top: m.y + "%" }}>
          <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shadow-lg ring-2 ring-white" style={{ background: BRAND.red }}>{m.n || i + 1}</span>
        </div>
      ))}
      {!readOnly && here.length === 0 && <span className="absolute inset-0 grid place-items-center text-xs text-slate-400 pointer-events-none">Toque na imagem para marcar o dano</span>}
    </div>
  );
}
const carLine = { fill: "none", stroke: "#94a3b8", strokeWidth: 3, strokeLinejoin: "round" };
const CAR_SVG = {
  superior: (<g><rect x="90" y="20" width="140" height="140" rx="26" style={carLine} /><line x1="90" y1="66" x2="230" y2="66" style={{ ...carLine, strokeWidth: 2 }} /><line x1="90" y1="120" x2="230" y2="120" style={{ ...carLine, strokeWidth: 2 }} /><rect x="112" y="74" width="96" height="40" rx="8" style={{ ...carLine, strokeWidth: 2 }} /></g>),
  frente: (<g><rect x="70" y="60" width="180" height="80" rx="16" style={carLine} /><rect x="92" y="72" width="136" height="34" rx="8" style={{ ...carLine, strokeWidth: 2 }} /><circle cx="98" cy="128" r="9" style={carLine} /><circle cx="222" cy="128" r="9" style={carLine} /><rect x="86" y="120" width="18" height="8" rx="3" style={{ ...carLine, strokeWidth: 2 }} /><rect x="216" y="120" width="18" height="8" rx="3" style={{ ...carLine, strokeWidth: 2 }} /></g>),
  traseira: (<g><rect x="70" y="60" width="180" height="80" rx="16" style={carLine} /><rect x="92" y="74" width="136" height="30" rx="6" style={{ ...carLine, strokeWidth: 2 }} /><rect x="86" y="116" width="24" height="14" rx="3" style={{ ...carLine, strokeWidth: 2 }} /><rect x="210" y="116" width="24" height="14" rx="3" style={{ ...carLine, strokeWidth: 2 }} /></g>),
  lat_esq: (<g><path d="M40 120 L40 96 Q64 62 108 60 L196 60 Q250 62 280 96 L280 120 Z" style={carLine} /><path d="M96 62 L120 90 L190 90 L196 62" style={{ ...carLine, strokeWidth: 2 }} /><circle cx="96" cy="122" r="16" style={carLine} /><circle cx="230" cy="122" r="16" style={carLine} /></g>),
  lat_dir: (<g><path d="M280 120 L280 96 Q256 62 212 60 L124 60 Q70 62 40 96 L40 120 Z" style={carLine} /><path d="M224 62 L200 90 L130 90 L124 62" style={{ ...carLine, strokeWidth: 2 }} /><circle cx="224" cy="122" r="16" style={carLine} /><circle cx="90" cy="122" r="16" style={carLine} /></g>),
};

/* ================= LOGIN ================= */
function Login({ users, onLogin, onSeed, bootErr }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const submit = () => {
    const found = users.find((x) => x.login.toLowerCase() === u.trim().toLowerCase() && x.ativo !== false);
    if (!found || dec(found.senha) !== p) { setErr("Usuário ou senha inválidos."); return; }
    onLogin(found);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(160deg," + BRAND.navy + " 0%, #0c1746 60%, #060d2c 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
            <img src={LOGO} alt="Kairos Telecom" className="h-16 w-auto mx-auto mb-3 object-contain" />
            <h1 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: "Archivo, sans-serif" }}>Kairos Frota</h1>
            <p className="text-xs text-slate-500 mt-0.5">Gestão Inteligente de Frotas</p>
            {bootErr && <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mt-2">{bootErr}</p>}
          </div>
          <div className="px-8 py-6 space-y-3">
            {users.length === 0 ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-slate-600">Primeiro acesso — crie o administrador padrão para começar.</p>
                <Btn className="w-full" onClick={onSeed}><ShieldCheck size={16} /> Criar acesso administrador</Btn>
                <p className="text-[11px] text-slate-400">Login <b>admin</b> · senha <b>admin</b> — troque após entrar.</p>
              </div>
            ) : (
              <>
                <Field label="Usuário"><Inp value={u} onChange={(e) => { setU(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="seu login" autoFocus /></Field>
                <Field label="Senha"><Inp type="password" value={p} onChange={(e) => { setP(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••" /></Field>
                {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
                <Btn className="w-full" onClick={submit}><LogIn size={16} /> Entrar</Btn>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] text-white/50 mt-4">Kairos Telecom · Kaironanet Ltda — Pentecoste/CE</p>
      </div>
    </div>
  );
}

/* ================= DASHBOARD ================= */
function Dashboard({ data, alerts, go, onOS, user }) {
  const mk = todayISO().slice(0, 7); const yk = todayISO().slice(0, 4); const td = todayISO();
  const rows = allCostRows(data);
  const gastoHoje = sumBy(rows.filter((r) => r.data === td), (r) => r.valor);
  const gastoMes = sumBy(rows.filter((r) => monthKey(r.data) === mk), (r) => r.valor);
  const gastoAno = sumBy(rows.filter((r) => String(r.data).slice(0, 4) === yk), (r) => r.valor);
  const { medias } = fuelStats(data.fuel, data.vehicles);
  const mv = Object.values(medias).filter(Boolean);
  const mediaGeral = mv.length ? mv.reduce((a, b) => a + b, 0) / mv.length : 0;
  const st = (s) => data.vehicles.filter((v) => v.status === s).length;
  const totalKm = sumBy(data.vehicles, (v) => num(v.kmAtual));
  const custoKm = totalKm > 0 ? gastoAno / totalKm : 0;

  const meses = [...Array(6)].map((_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); });
  const evolucao = meses.map((m) => ({ mes: monthLabel(m), custo: Math.round(sumBy(rows.filter((r) => monthKey(r.data) === m), (r) => r.valor)) }));
  const porCat = CAT_CUSTO.map((c) => ({ name: c, value: Math.round(sumBy(rows.filter((r) => r.categoria === c), (r) => r.valor)) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const PIE = [BRAND.navy, BRAND.royal, BRAND.amber, BRAND.green, BRAND.red, BRAND.yellow, "#6366f1", "#0891b2", "#7c3aed", "#db2777", "#64748b"];

  const custoPorVeic = data.vehicles.map((v) => ({ v, total: sumBy(rows.filter((r) => r.veiculoId === v.id && String(r.data).slice(0, 4) === yk), (r) => r.valor) })).filter((x) => x.total > 0);
  const rankCaros = [...custoPorVeic].sort((a, b) => b.total - a.total).slice(0, 5);
  const criticos = alerts.filter((a) => a.nivel === "critico").length;
  const nMap = { critico: 0, alto: 0, medio: 0, info: 0 }; alerts.forEach((a) => nMap[a.nivel]++);
  // status de manutenção por cor
  const vmap2 = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const cMap = { 1: 0, 2: 0, 3: 0, 4: 0 };
  data.plans.forEach((p) => { const c = planColor(p, vmap2[p.veiculoId]); if (c) cMap[c]++; });
  // pendências de checklist (último por veículo com não conforme)
  const lastCheck = {}; data.checklists.forEach((c) => { if (!lastCheck[c.veiculoId] || c.ts > lastCheck[c.veiculoId].ts) lastCheck[c.veiculoId] = c; });
  const checkPend = Object.values(lastCheck).filter((c) => c.ncCount > 0).length;

  return (
    <div className="space-y-5">
      <PageHead title={"Olá, " + user.nome.split(" ")[0]} sub={"Painel executivo · " + fmtD(todayISO())} />
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {criticos > 0 && <Badge tone="red"><AlertTriangle size={12} /> {criticos} crítico(s)</Badge>}
          {nMap.alto > 0 && <Badge tone="amber"><Bell size={12} /> {nMap.alto} alto(s)</Badge>}
          {nMap.medio > 0 && <Badge tone="yellow">{nMap.medio} médio(s)</Badge>}
          {nMap.info > 0 && <Badge tone="blue">{nMap.info} informativo(s)</Badge>}
          <button onClick={() => go("notif")} className="text-xs font-bold text-blue-700 hover:underline ml-1">Ver central de alertas →</button>
        </div>
      )}
      {data.plans.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-4">
          <span className="text-xs font-bold text-slate-500 uppercase">Manutenção preventiva:</span>
          {[4, 3, 2, 1].map((k) => <button key={k} onClick={() => go("manut")} className="inline-flex items-center gap-1.5 text-sm hover:opacity-70"><span style={{ fontSize: 15 }}>{PLAN_COLORS[k][0]}</span><span className="font-bold" style={{ color: PLAN_COLORS[k][2], fontVariantNumeric: "tabular-nums" }}>{cMap[k]}</span><span className="text-xs text-slate-500">{PLAN_COLORS[k][1]}</span></button>)}
          {checkPend > 0 && <button onClick={() => go("resumo")} className="ml-auto"><Badge tone="red"><ClipboardList size={12} /> {checkPend} checklist(s) com pendência</Badge></button>}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={Wallet} tone="navy" label="Gasto hoje" value={fmtBRL(gastoHoje)} />
        <KPI icon={Wallet} tone="royal" label="Gasto no mês" value={fmtBRL(gastoMes)} sub={monthLabel(mk)} />
        <KPI icon={TrendingUp} tone="amber" label="Gasto no ano" value={fmtBRL(gastoAno)} sub={yk} />
        <KPI icon={Gauge} tone="green" label="Custo por KM (ano)" value={fmtBRL(custoKm)} sub={fmtN(totalKm) + " km na frota"} />
        <KPI icon={Fuel} tone="royal" label="Consumo médio" value={mediaGeral ? fmtN(mediaGeral, 2) + " km/l" : "—"} sub="média da frota" />
        <KPI icon={Truck} tone="green" label="Veículos ativos" value={st("ativo")} sub={data.vehicles.length + " no total"} />
        <KPI icon={Wrench} tone="amber" label="Em manutenção" value={st("manutencao")} sub={st("parado") + " parado(s)"} />
        <KPI icon={AlertTriangle} tone="red" label="Alertas críticos" value={criticos} sub={alerts.length + " alertas ativos"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Evolução dos custos (6 meses)</h3>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={evolucao} margin={{ left: -10, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v) => "R$" + (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Line type="monotone" dataKey="custo" stroke={BRAND.royal} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-3">Custos por categoria (total)</h3>
          {porCat.length === 0 ? <p className="text-xs text-slate-400 py-10 text-center">Sem custos lançados.</p> : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={porCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} innerRadius={44}>
                  {porCat.map((e, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Ranking — veículos mais caros (ano)</h3>
            <button onClick={() => go("custos")} className="text-xs font-bold text-blue-700 hover:underline">Detalhes →</button>
          </div>
          {rankCaros.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">Sem dados.</p> : (
            <div className="space-y-2">
              {rankCaros.map((x, i) => (
                <div key={x.v.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md grid place-items-center text-xs font-extrabold text-white shrink-0" style={{ background: i === 0 ? BRAND.red : i === 1 ? BRAND.amber : BRAND.navy }}>{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{x.v.prefixo} · {x.v.placa || "s/ placa"}</span>
                  <span className="text-sm font-bold text-slate-900" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtBRL(x.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Alertas prioritários</h3>
            <button onClick={() => go("notif")} className="text-xs font-bold text-blue-700 hover:underline">Ver todos →</button>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-6"><CheckCircle2 className="mx-auto text-emerald-400 mb-1" size={26} /><p className="text-xs text-slate-500">Nenhum alerta ativo. Frota em dia.</p></div>
          ) : (
            <div className="space-y-2">{alerts.slice(0, 4).map((a) => <AlertCard key={a.id} a={a} onOS={onOS} canOS={can(user, "os", "edit")} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= VEÍCULOS ================= */
function Veiculos({ data, save, user, focus, clearFocus }) {
  const [q, setQ] = useState(""); const [fStatus, setFStatus] = useState("");
  const [edit, setEdit] = useState(null); const [view, setView] = useState(null);
  const editable = can(user, "veiculos", "edit");
  const lists = useMemo(() => ({
    marca: [...new Set(data.vehicles.map((v) => v.marca).filter(Boolean))],
    centroCusto: [...new Set(data.vehicles.map((v) => v.centroCusto).filter(Boolean))],
    contrato: [...new Set(data.vehicles.map((v) => v.contrato).filter(Boolean))],
    regional: [...new Set(data.vehicles.map((v) => v.regional).filter(Boolean))],
  }), [data.vehicles]);
  const fuels = (data.fuels || []).filter((f) => f.ativo !== false);
  useEffect(() => { if (focus) { const v = data.vehicles.find((x) => x.id === focus); if (v) setView(v); clearFocus(); } }, [focus]);

  const filtered = data.vehicles.filter((v) => {
    const s = (v.prefixo + " " + v.placa + " " + v.marca + " " + v.modelo + " " + (v.numeroFrota || "")).toLowerCase();
    return (!q || s.includes(q.toLowerCase())) && (!fStatus || v.status === fStatus);
  });
  const etOf = (id) => (data.equipTypes || []).find((x) => x.id === id);
  const startNew = () => setEdit({ status: "ativo", combustivel: fuels[0]?.nome || "", kmAtual: "", docs: [], tipoEquipamentoId: "" });
  const submit = () => {
    if (!edit.prefixo || edit.kmAtual === "") return;
    const et = etOf(edit.tipoEquipamentoId);
    const emplacado = et ? et.categoria === "emplacado" : true;
    if (emplacado && !edit.placa) { alert("Veículos emplacados exigem placa."); return; }
    // duplicidade
    const plLc = (edit.placa || "").trim().toLowerCase();
    if (edit.placa && data.vehicles.some((v) => v.id !== edit.id && (v.placa || "").trim().toLowerCase() === plLc)) { alert("Já existe um veículo com esta placa."); return; }
    if (edit.numeroFrota && data.vehicles.some((v) => v.id !== edit.id && String(v.numeroFrota || "").trim() === String(edit.numeroFrota).trim())) { alert("Já existe um veículo com este número de frota."); return; }
    const rec = { ...edit, usaHorimetro: et ? !!et.usaHorimetro : edit.usaHorimetro, diagramaId: edit.diagramaId || (et ? et.diagramaId : "") };
    const list = edit.id ? data.vehicles.map((x) => x.id === edit.id ? rec : x) : [...data.vehicles, { ...rec, id: uid(), docs: edit.docs || [], criadoEm: nowISO() }];
    save({ vehicles: list }, (edit.id ? "Editou" : "Cadastrou") + " frota " + edit.prefixo);
    setEdit(null);
  };
  const del = (v) => { if (!confirm("Remover a frota " + v.prefixo + "? O histórico associado permanece registrado.")) return; save({ vehicles: data.vehicles.filter((x) => x.id !== v.id) }, "Removeu frota " + v.prefixo); setView(null); };

  return (
    <div>
      <PageHead title="Cadastro de Frotas" sub={data.vehicles.length + " frota(s) · veículos e equipamentos"} actions={editable && <Btn onClick={startNew}><Plus size={16} /> Nova frota</Btn>} />
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input className={inpCls + " pl-9"} placeholder="Buscar por prefixo, placa, nº de frota, modelo…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Sel value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_VEIC).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel>
      </div>
      {(data.equipTypes || []).length === 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 mb-3 flex gap-2"><Info size={15} className="shrink-0 mt-0.5" /><span>Cadastre os <b>Tipos de Equipamento</b> e <b>Diagramas</b> em Administração para aproveitar as regras de placa, horímetro e posições de pneus.</span></div>}
      {data.vehicles.length === 0 ? (
        <Empty icon={Truck} title="Nenhuma frota cadastrada" sub="Cadastre veículos e equipamentos para controlar checklist, abastecimento, custos, manutenção, pneus e calibragem.">
          {editable && <Btn onClick={startNew}><Plus size={16} /> Cadastrar primeira frota</Btn>}
        </Empty>
      ) : (
        <DataTable
          onRow={setView}
          cols={[
            { label: "Prefixo/Frota", render: (v) => <span className="font-bold text-slate-900">{v.prefixo}{v.numeroFrota ? " · " + v.numeroFrota : ""}</span> },
            { label: "Placa", render: (v) => v.placa || "—" },
            { label: "Modelo", render: (v) => <span className="text-slate-600">{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</span> },
            { label: "Tipo", render: (v) => etOf(v.tipoEquipamentoId)?.nome || "—" },
            { label: "Medição", render: (v) => v.usaHorimetro ? fmtN(v.horimetro) + " h" : fmtN(v.kmAtual) + " km" },
            { label: "Status", render: (v) => <Badge tone={STATUS_VEIC[v.status][1]}>{STATUS_VEIC[v.status][0]}</Badge> },
          ]}
          rows={filtered}
        />
      )}

      {edit && <VeicForm edit={edit} setEdit={setEdit} submit={submit} data={data} lists={lists} fuels={fuels} etOf={etOf} />}
      {view && (
        <Modal title={view.prefixo + (view.placa ? " · " + view.placa : "")} sub={[view.marca, view.modelo, view.anoModelo || view.ano].filter(Boolean).join(" ")} onClose={() => setView(null)} w="max-w-3xl"
          footer={editable && <><Btn v="dan" onClick={() => del(view)}><Trash2 size={14} /> Remover</Btn><Btn v="sec" onClick={() => { setEdit(view); setView(null); }}><Pencil size={14} /> Editar</Btn></>}>
          <VeicDetail v={view} data={data} />
        </Modal>
      )}
    </div>
  );
}
function VeicForm({ edit, setEdit, submit, data, lists, fuels, etOf }) {
  const [tab, setTab] = useState("ident");
  const [ocrOpen, setOcrOpen] = useState(false);
  const et = etOf(edit.tipoEquipamentoId);
  const emplacado = et ? et.categoria === "emplacado" : true;
  const usaHor = et ? et.usaHorimetro : edit.usaHorimetro;
  const cfg = { ...DEF_ALERTCFG, ...(data.settings.alertCfg || {}) };
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const setTipo = (id) => { const t = etOf(id); setEdit({ ...edit, tipoEquipamentoId: id, usaHorimetro: t ? t.usaHorimetro : edit.usaHorimetro, diagramaId: edit.diagramaId || (t ? t.diagramaId : "") }); };

  const tabs = [["ident", "Identificação"], ["doc", "Documentação"], ["oper", "Operação"], ["pneus", "Pneus e Diagrama"], ["config", "Configurações"], ...(edit.id ? [["hist", "Histórico"]] : [])];
  const podeSalvar = edit.prefixo && edit.kmAtual !== "" && !(emplacado && !edit.placa);

  return (
    <Modal title={edit.id ? "Editar frota" : "Nova frota"} sub="Campos com * são obrigatórios" onClose={() => setEdit(null)} w="max-w-3xl"
      footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!podeSalvar}>Salvar</Btn></>}>
      <Tabs cur={tab} set={setTab} tabs={tabs} />

      {tab === "ident" && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={"Placa" + (emplacado ? "" : " (opcional p/ linha amarela)")} req={emplacado}><Inp value={edit.placa || ""} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder={emplacado ? "ABC1D23" : "—"} /></Field>
            <Field label="Número da frota" hint="Opcional, porém altamente recomendado"><Inp value={edit.numeroFrota || ""} onChange={(e) => set("numeroFrota", e.target.value)} /></Field>
            <Field label="Tipo de equipamento" req><Sel value={edit.tipoEquipamentoId || ""} onChange={(e) => setTipo(e.target.value)}><option value="">Selecione…</option>{(data.equipTypes || []).map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.categoria === "amarela" ? "linha amarela" : "emplacado"})</option>)}</Sel></Field>
            <Field label="Prefixo / Nome da frota" req><Inp value={edit.prefixo || ""} onChange={(e) => set("prefixo", e.target.value)} placeholder="Ex.: FRT-014" /></Field>
            <Field label="Marca"><Inp list="dl-marca" value={edit.marca || ""} onChange={(e) => set("marca", e.target.value)} /><datalist id="dl-marca">{lists.marca.map((m) => <option key={m} value={m} />)}</datalist></Field>
            <Field label="Modelo"><Inp value={edit.modelo || ""} onChange={(e) => set("modelo", e.target.value)} /></Field>
            <Field label="Versão"><Inp value={edit.versao || ""} onChange={(e) => set("versao", e.target.value)} /></Field>
            <Field label="Ano de fabricação"><Inp type="number" value={edit.anoFab || ""} onChange={(e) => set("anoFab", e.target.value)} /></Field>
            <Field label="Ano do modelo"><Inp type="number" value={edit.anoModelo || ""} onChange={(e) => set("anoModelo", e.target.value)} /></Field>
            <Field label="Cor"><Inp value={edit.cor || ""} onChange={(e) => set("cor", e.target.value)} /></Field>
          </div>
          <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-900"><Sparkles size={15} /><span>Tem o CRLV? Anexe e a IA preenche placa, marca, modelo, ano, chassi e RENAVAM automaticamente.</span></div>
            <Btn sm onClick={() => setOcrOpen(true)}><FileUp size={14} /> Anexar documento (CRLV)</Btn>
          </div>
        </>
      )}

      {tab === "doc" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Chassi"><Inp value={edit.chassi || ""} onChange={(e) => set("chassi", e.target.value)} /></Field>
          <Field label="RENAVAM"><Inp value={edit.renavam || ""} onChange={(e) => set("renavam", e.target.value)} /></Field>
          <Field label="Vencimento do seguro"><Inp type="date" value={edit.seguroVenc || ""} onChange={(e) => set("seguroVenc", e.target.value)} /></Field>
          <Field label="Vencimento do IPVA"><Inp type="date" value={edit.ipvaVenc || ""} onChange={(e) => set("ipvaVenc", e.target.value)} /></Field>
          <Field label="Vencimento do licenciamento"><Inp type="date" value={edit.licVenc || ""} onChange={(e) => set("licVenc", e.target.value)} /></Field>
          <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-slate-600">Anexos de CRLV, nota fiscal, manual e outros — com histórico de versões.</span>
            <Btn sm v="sec" onClick={() => setOcrOpen(true)}><FileUp size={14} /> Anexar / ler CRLV</Btn>
          </div>
          {(edit.docs || []).length > 0 && <div className="sm:col-span-2 flex flex-wrap gap-2">{edit.docs.map((d) => <Badge key={d.id} tone="blue"><FileText size={11} /> {d.tipo}{d.validade ? " · " + fmtD(d.validade) : ""}</Badge>)}</div>}
        </div>
      )}

      {tab === "oper" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Combustível"><Sel value={edit.combustivel || ""} onChange={(e) => set("combustivel", e.target.value)}><option value="">Selecione…</option>{fuels.map((f) => <option key={f.id} value={f.nome}>{f.nome}</option>)}</Sel></Field>
          <Field label="Capacidade do tanque (L)"><Inp type="number" step="0.1" value={edit.capacidadeTanque || ""} onChange={(e) => set("capacidadeTanque", e.target.value)} /></Field>
          <Field label="Quilometragem inicial"><Inp type="number" value={edit.kmInicial || ""} onChange={(e) => set("kmInicial", e.target.value)} /></Field>
          {usaHor && <Field label="Horímetro inicial (h)"><Inp type="number" step="0.1" value={edit.horInicial || ""} onChange={(e) => set("horInicial", e.target.value)} /></Field>}
          <Field label={usaHor ? "Horímetro atual (h) *" : "KM atual *"}>{usaHor ? <Inp type="number" step="0.1" value={edit.horimetro || ""} onChange={(e) => setEdit({ ...edit, horimetro: e.target.value, kmAtual: edit.kmAtual || "0" })} /> : <Inp type="number" value={edit.kmAtual || ""} onChange={(e) => set("kmAtual", e.target.value)} />}</Field>
          <Field label="Status" req><Sel value={edit.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(STATUS_VEIC).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel></Field>
          <Field label="Centro de custo"><Inp list="dl-cc" value={edit.centroCusto || ""} onChange={(e) => set("centroCusto", e.target.value)} /><datalist id="dl-cc">{lists.centroCusto.map((m) => <option key={m} value={m} />)}</datalist></Field>
          <Field label="Unidade / Contrato" hint="Ex.: AMP, Parauapebas"><Inp list="dl-ct" value={edit.contrato || ""} onChange={(e) => set("contrato", e.target.value)} /><datalist id="dl-ct">{(lists.contrato || []).map((m) => <option key={m} value={m} />)}</datalist></Field>
          <Field label="Regional"><Inp list="dl-rg" value={edit.regional || ""} onChange={(e) => set("regional", e.target.value)} /><datalist id="dl-rg">{(lists.regional || []).map((m) => <option key={m} value={m} />)}</datalist></Field>
        </div>
      )}

      {tab === "pneus" && (
        <div className="space-y-3">
          <Field label="Diagrama de rodagem"><Sel value={edit.diagramaId || ""} onChange={(e) => set("diagramaId", e.target.value)}><option value="">Automático do tipo{et ? " (" + ((data.diagrams || []).find((d) => d.id === et.diagramaId)?.nome || "—") + ")" : ""}</option>{(data.diagrams || []).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Sel></Field>
          {(() => { const dg = diagramOf({ ...edit }, data); const pos = dg && !dg.semPneus ? dg.posicoes : []; return dg ? (dg.semPneus ? <p className="text-xs text-slate-400">Equipamento de esteira — não controla pneus.</p> : <div><span className="block text-xs font-semibold text-slate-600 mb-1.5">Posições ({pos.length})</span><div className="flex flex-wrap gap-1">{pos.map((p) => <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-bold text-slate-600">{p}</span>)}</div></div>) : <p className="text-xs text-slate-400">Selecione o tipo de equipamento ou um diagrama para ver as posições.</p>; })()}
        </div>
      )}

      {tab === "config" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Intervalo de calibragem (dias)" hint={"Padrão da empresa: " + cfg.calibIntervalDias + " dias"}><Inp type="number" value={edit.calibIntervalDias || ""} onChange={(e) => set("calibIntervalDias", e.target.value)} placeholder={"herda " + cfg.calibIntervalDias} /></Field>
          <Field label="Intervalo de inspeção (dias)" hint={"Padrão da empresa: " + cfg.inspIntervalDias + " dias"}><Inp type="number" value={edit.inspIntervalDias || ""} onChange={(e) => set("inspIntervalDias", e.target.value)} placeholder={"herda " + cfg.inspIntervalDias} /></Field>
          <Field label="Observações" span={2}><TA value={edit.obs || ""} onChange={(e) => set("obs", e.target.value)} placeholder="Informações adicionais…" /></Field>
        </div>
      )}

      {tab === "hist" && edit.id && <VeicHistoricoMini v={edit} data={data} />}

      {ocrOpen && <OcrCadastro onClose={() => setOcrOpen(false)} onApply={(campos, doc) => {
        setEdit((p) => ({ ...p,
          placa: campos.placa || p.placa, marca: campos.marca || p.marca, modelo: campos.modelo || p.modelo,
          anoModelo: campos.ano || p.anoModelo, chassi: campos.chassi || p.chassi, renavam: campos.renavam || p.renavam,
          docs: doc ? [...(p.docs || []), doc] : (p.docs || []),
        }));
        setOcrOpen(false);
      }} />}
    </Modal>
  );
}
function VeicHistoricoMini({ v, data }) {
  const cnt = {
    Abastecimentos: data.fuel.filter((f) => f.veiculoId === v.id).length,
    Checklists: (data.checklists || []).filter((c) => c.veiculoId === v.id).length,
    Manutenções: data.mrecords.filter((m) => m.veiculoId === v.id).length,
    "Ordens de serviço": data.os.filter((o) => o.veiculoId === v.id).length,
    Calibragens: (data.calibrations || []).filter((c) => c.veiculoId === v.id).length,
    Inspeções: (data.inspections || []).filter((c) => c.veiculoId === v.id).length,
    Documentos: (v.docs || []).length,
  };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Object.entries(cnt).map(([k, n]) => <div key={k} className="bg-slate-50 rounded-lg p-3 text-center"><p className="text-xl font-extrabold text-slate-900">{n}</p><p className="text-[11px] text-slate-500">{k}</p></div>)}
      <div className="col-span-full text-[11px] text-slate-400 text-center mt-1">Registros vinculados a esta frota. Detalhes completos em cada módulo e no Histórico Fotográfico.</div>
    </div>
  );
}
// OCR reutilizável para o cadastro (lê CRLV e devolve campos + documento anexável)
function OcrCadastro({ onClose, onApply }) {
  const [arquivo, setArquivo] = useState(null); const [nome, setNome] = useState("");
  const [ocr, setOcr] = useState(null); const [load, setLoad] = useState(false); const [err, setErr] = useState("");
  const [tipo, setTipo] = useState("CRLV"); const [validade, setValidade] = useState("");
  const ref = useRef();
  const pick = async (f) => { setNome(f.name); setErr(""); if (f.type.startsWith("image")) setArquivo(await compressImage(f, 1200, 0.7)); else setArquivo(await fileToDataURL(f)); };
  const run = async () => {
    if (!arquivo || !arquivo.startsWith("data:image")) { setErr("Anexe uma imagem (JPG/PNG) do CRLV para leitura."); return; }
    setLoad(true); setErr("");
    try {
      const b64 = arquivo.split(",")[1]; const media = arquivo.substring(5, arquivo.indexOf(";"));
      const content = [{ type: "image", source: { type: "base64", media_type: media, data: b64 } }, { type: "text", text: "Leia este CRLV brasileiro e extraia os dados. Responda APENAS com JSON válido: {\"placa\":\"\",\"marca\":\"\",\"modelo\":\"\",\"ano\":\"\",\"chassi\":\"\",\"renavam\":\"\"}. String vazia se não encontrar. Sem texto fora do JSON." }];
      const r = await askAI(content, true); setOcr(r);
    } catch (e) { setErr(e.message || "Não foi possível ler o documento."); } finally { setLoad(false); }
  };
  const aplicar = () => {
    const doc = arquivo ? { id: uid(), tipo, validade, arquivo, nomeArquivo: nome, criadoEm: nowISO(), ocr } : null;
    onApply(ocr || {}, doc);
  };
  return (
    <Modal title="Anexar documento e ler (OCR)" sub="CRLV ou documento da máquina" onClose={onClose}
      footer={<><Btn v="sec" onClick={onClose}>Cancelar</Btn><Btn onClick={aplicar} disabled={!arquivo}>Usar dados / anexar</Btn></>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tipo de documento"><Sel value={tipo} onChange={(e) => setTipo(e.target.value)}>{DOC_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Sel></Field>
          <Field label="Validade (se houver)"><Inp type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
        </div>
        <div><input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files[0] && pick(e.target.files[0])} />
          <Btn v="sec" onClick={() => ref.current?.click()}><FileUp size={16} /> {arquivo ? "Trocar arquivo" : "Selecionar CRLV"}</Btn>
          {nome && <span className="ml-2 text-xs text-slate-500">{nome}</span>}
        </div>
        {arquivo && arquivo.startsWith("data:image") && <img src={arquivo} className="max-h-40 rounded-lg border" />}
        {arquivo && arquivo.startsWith("data:image") && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Sparkles size={13} /> Leitura automática</span><Btn sm onClick={run} disabled={load}>{load ? <Spin label="Lendo…" /> : "Ler CRLV"}</Btn></div>
            {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
            {ocr && <div className="mt-2 grid grid-cols-2 gap-2 text-xs">{Object.entries(ocr).map(([k, val]) => <div key={k} className="bg-white rounded p-1.5"><span className="text-slate-400 uppercase text-[9px]">{k}</span><input className="w-full font-semibold text-slate-800 bg-transparent outline-none" value={val} onChange={(e) => setOcr({ ...ocr, [k]: e.target.value })} /></div>)}<p className="col-span-2 text-[10px] text-slate-400">Confira e corrija antes de usar. Ao aplicar, os campos do cadastro são preenchidos e o documento é anexado.</p></div>}
          </div>
        )}
        {err && !arquivo && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}
function VeicDetail({ v, data }) {
  const rows = allCostRows(data).filter((r) => r.veiculoId === v.id);
  const totalAno = sumBy(rows.filter((r) => String(r.data).slice(0, 4) === todayISO().slice(0, 4)), (r) => r.valor);
  const { medias } = fuelStats(data.fuel, data.vehicles);
  const tires = data.tires.filter((t) => t.veiculoId === v.id && t.status === "em_uso");
  const et = (data.equipTypes || []).find((x) => x.id === v.tipoEquipamentoId);
  const dg = diagramOf(v, data);
  const info = [
    ["Nº da frota", v.numeroFrota || "—"], ["Placa", v.placa || "—"], ["Tipo", et?.nome || "—"],
    [v.usaHorimetro ? "Horímetro" : "KM atual", v.usaHorimetro ? fmtN(v.horimetro) + " h" : fmtN(v.kmAtual) + " km"],
    ["Combustível padrão", v.combustivel || "—"], ["Tanque", v.capacidadeTanque ? v.capacidadeTanque + " L" : "—"],
    ["Versão", v.versao || "—"], ["Cor", v.cor || "—"], ["Ano fab./modelo", [v.anoFab, v.anoModelo].filter(Boolean).join("/") || "—"],
    ["Chassi", v.chassi || "—"], ["RENAVAM", v.renavam || "—"], ["Centro de custo", v.centroCusto || "—"],
    ["Diagrama", dg?.nome || "—"],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPI icon={Wallet} tone="amber" label="Custo no ano" value={fmtBRL(totalAno)} />
        <KPI icon={Fuel} tone="royal" label="Consumo médio" value={medias[v.id] ? fmtN(medias[v.id], 2) + " km/l" : "—"} />
        <KPI icon={CircleDot} tone="green" label="Pneus em uso" value={tires.length} />
        <KPI icon={Gauge} tone="navy" label="Status" value={STATUS_VEIC[v.status][0]} />
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50 rounded-xl p-4">
        {info.map(([k, val]) => <div key={k} className="flex justify-between text-sm border-b border-slate-100 py-1"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{val}</span></div>)}
      </div>
      {[["seguroVenc", "Seguro"], ["ipvaVenc", "IPVA"], ["licVenc", "Licenciamento"]].some(([k]) => v[k]) && (
        <div>
          <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Documentos com vencimento</h4>
          <div className="flex flex-wrap gap-2">
            {[["seguroVenc", "Seguro"], ["ipvaVenc", "IPVA"], ["licVenc", "Licenciamento"]].filter(([k]) => v[k]).map(([k, label]) => {
              const d = daysUntil(v[k]); const tone = d < 0 ? "red" : d <= 30 ? "amber" : "green";
              return <Badge key={k} tone={tone}>{label}: {fmtD(v[k])}{d < 0 ? " (vencido)" : d <= 30 ? " (" + d + "d)" : ""}</Badge>;
            })}
          </div>
        </div>
      )}
      {(v.docs || []).length > 0 && <div><h4 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Documentos anexados</h4><div className="flex flex-wrap gap-2">{v.docs.map((d) => <Badge key={d.id} tone="blue"><FileText size={11} /> {d.tipo}{d.validade ? " · " + fmtD(d.validade) : ""}</Badge>)}</div></div>}
      {v.obs && <div className="text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3"><b>Observações:</b> {v.obs}</div>}
    </div>
  );
}

/* ================= ABASTECIMENTO ================= */
function Abastecimento({ data, save, user }) {
  const [edit, setEdit] = useState(null); const [fV, setFV] = useState("");
  const editable = can(user, "abast", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const { enriched, medias } = useMemo(() => fuelStats(data.fuel, data.vehicles), [data.fuel, data.vehicles]);
  const listaMot = [...new Set([...data.fuel.map((f) => f.motorista), ...data.users.filter((u) => u.perfil === "motorista").map((u) => u.nome)].filter(Boolean))];
  const rows = [...data.fuel].filter((f) => !fV || f.veiculoId === fV).sort((a, b) => String(b.data + b.hora).localeCompare(String(a.data + a.hora)));

  const startNew = () => setEdit({ data: todayISO(), hora: nowTime(), motorista: user.perfil === "motorista" ? user.nome : "", veiculoId: fV || "", combustivel: "" });
  useEffect(() => { if (edit && edit.veiculoId && !edit.id) { const v = vmap[edit.veiculoId]; if (v) setEdit((p) => ({ ...p, km: p.km || v.kmAtual, combustivel: p.combustivel || v.combustivel || "", horimetro: p.horimetro || (v.usaHorimetro ? v.horimetro : "") })); } }, [edit && edit.veiculoId]);
  const total = num(edit?.litros) * num(edit?.valorLitro);

  const submit = () => {
    if (!edit.veiculoId || !edit.km || !edit.litros) return;
    const rec = { ...edit, valorTotal: total || num(edit.valorTotal), id: edit.id || uid() };
    const list = edit.id ? data.fuel.map((f) => f.id === edit.id ? rec : f) : [...data.fuel, rec];
    const v = vmap[edit.veiculoId];
    let vehicles = data.vehicles;
    if (v && num(rec.km) > num(v.kmAtual)) vehicles = data.vehicles.map((x) => x.id === v.id ? { ...x, kmAtual: num(rec.km), horimetro: rec.horimetro && v.usaHorimetro ? num(rec.horimetro) : x.horimetro } : x);
    save({ fuel: list, vehicles }, (edit.id ? "Editou" : "Registrou") + " abastecimento · " + (v ? v.prefixo : ""));
    setEdit(null);
  };
  const del = (f) => { if (!confirm("Remover este abastecimento?")) return; save({ fuel: data.fuel.filter((x) => x.id !== f.id) }, "Removeu abastecimento"); setEdit(null); };

  return (
    <div>
      <PageHead title="Abastecimento" sub={data.fuel.length + " registro(s) · KM do veículo atualizado automaticamente"} actions={editable && <Btn onClick={startNew} disabled={!data.vehicles.length}><Plus size={16} /> Novo abastecimento</Btn>} />
      <div className="mb-3"><Sel value={fV} onChange={(e) => setFV(e.target.value)} ><option value="">Todos os veículos</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></div>
      {data.vehicles.length === 0 ? <Empty icon={Truck} title="Cadastre um veículo primeiro" sub="O abastecimento precisa estar vinculado a um veículo da frota." />
      : data.fuel.length === 0 ? <Empty icon={Fuel} title="Nenhum abastecimento registrado" sub="Ao registrar, o sistema atualiza o KM, calcula km/l e detecta consumo fora do padrão automaticamente.">{editable && <Btn onClick={startNew}><Plus size={16} /> Registrar abastecimento</Btn>}</Empty>
      : (
        <DataTable onRow={editable ? setEdit : undefined}
          cols={[
            { label: "Data", render: (f) => fmtD(f.data) },
            { label: "Veículo", render: (f) => <span className="font-semibold">{vmap[f.veiculoId]?.prefixo || "—"}</span> },
            { label: "Motorista", render: (f) => f.motorista || "—" },
            { label: "KM", right: true, render: (f) => fmtN(f.km) },
            { label: "Litros", right: true, render: (f) => fmtN(f.litros, 1) },
            { label: "Valor", right: true, render: (f) => fmtBRL(f.valorTotal) },
            { label: "km/l", right: true, render: (f) => { const e = enriched[f.id]; return e?.kml ? <span className="font-bold">{fmtN(e.kml, 2)}</span> : "—"; } },
            { label: "", render: (f) => { const e = enriched[f.id]; const nf = (f.fotoPainel || []).length + (f.fotoBomba || []).length + (f.fotoNota || []).length; return <span className="flex gap-1 justify-end">{nf > 0 && <Badge tone="blue"><Camera size={11} /> {nf}</Badge>}{e?.flags?.length ? <span title={e.flags.join("\n")}><Badge tone="amber"><AlertTriangle size={11} /> {e.flags.length}</Badge></span> : null}</span>; } },
          ]}
          rows={rows}
        />
      )}
      {edit && (
        <Modal title={edit.id ? "Editar abastecimento" : "Novo abastecimento"} sub={medias[edit.veiculoId] ? "Média do veículo: " + fmtN(medias[edit.veiculoId], 2) + " km/l" : null} onClose={() => setEdit(null)}
          footer={<div className="flex justify-between w-full items-center"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.veiculoId || !edit.km || !edit.litros}>Salvar</Btn></div></div>}>
          <AbastInfo veiculoId={edit.veiculoId} data={data} vmap={vmap} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Veículo" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value })}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
            <Field label="Motorista"><Inp list="dl-mot" value={edit.motorista || ""} onChange={(e) => setEdit({ ...edit, motorista: e.target.value })} /><datalist id="dl-mot">{listaMot.map((m) => <option key={m} value={m} />)}</datalist></Field>
            <Field label="Data" req><Inp type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></Field>
            <Field label="Hora"><Inp type="time" value={edit.hora || ""} onChange={(e) => setEdit({ ...edit, hora: e.target.value })} /></Field>
            <Field label="KM atual" req><Inp type="number" value={edit.km || ""} onChange={(e) => setEdit({ ...edit, km: e.target.value })} /></Field>
            {vmap[edit.veiculoId]?.usaHorimetro && <Field label="Horímetro (h)"><Inp type="number" step="0.1" value={edit.horimetro || ""} onChange={(e) => setEdit({ ...edit, horimetro: e.target.value })} /></Field>}
            <Field label="Litros" req><Inp type="number" step="0.01" value={edit.litros || ""} onChange={(e) => setEdit({ ...edit, litros: e.target.value })} /></Field>
            <Field label="Valor por litro"><Inp type="number" step="0.001" value={edit.valorLitro || ""} onChange={(e) => setEdit({ ...edit, valorLitro: e.target.value })} /></Field>
            <Field label="Valor total" hint={total > 0 ? "Calculado: " + fmtBRL(total) : "Preencha litros e valor/litro para calcular"}><Inp type="number" step="0.01" value={edit.valorLitro && edit.litros ? total.toFixed(2) : (edit.valorTotal || "")} onChange={(e) => setEdit({ ...edit, valorTotal: e.target.value })} /></Field>
            <Field label="Combustível" type="select"><Sel value={edit.combustivel || ""} onChange={(e) => setEdit({ ...edit, combustivel: e.target.value })}><option value="">—</option>{(data.fuels || []).filter((f) => f.ativo !== false).map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}</Sel></Field>
            <Field label="Posto"><Inp value={edit.posto || ""} onChange={(e) => setEdit({ ...edit, posto: e.target.value })} /></Field>
            <Field label="Cidade"><Inp value={edit.cidade || ""} onChange={(e) => setEdit({ ...edit, cidade: e.target.value })} /></Field>
            <Field label="Observações" span={2}><TA value={edit.obs || ""} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} /></Field>
            <Field label="Foto do comprovante / painel (KM)"><PhotoInput label="Painel / hodômetro" max={2} photos={edit.fotoPainel || []} onChange={(ps) => setEdit({ ...edit, fotoPainel: ps })} /></Field>
            <Field label="Foto da bomba"><PhotoInput label="Bomba de combustível" max={2} photos={edit.fotoBomba || []} onChange={(ps) => setEdit({ ...edit, fotoBomba: ps })} /></Field>
            <Field label="Foto da nota fiscal (opcional)" span={2}><PhotoInput label="Nota / cupom" max={2} photos={edit.fotoNota || []} onChange={(ps) => setEdit({ ...edit, fotoNota: ps })} /></Field>
          </div>
          <InstrucoesAbastecimento />
        </Modal>
      )}
    </div>
  );
}
function AbastInfo({ veiculoId, data, vmap }) {
  if (!veiculoId) return null;
  const v = vmap[veiculoId]; if (!v) return null;
  const ult = [...data.fuel].filter((f) => f.veiculoId === veiculoId).sort((a, b) => String(b.data).localeCompare(String(a.data)))[0];
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-3 text-xs text-indigo-900 flex flex-wrap gap-x-5 gap-y-1">
      <span><b>Frota:</b> {v.prefixo}{v.placa ? " · " + v.placa : ""}</span>
      <span><b>Combustível padrão:</b> {v.combustivel || "—"}</span>
      <span><b>Último abastecimento:</b> {ult ? fmtD(ult.data) + " · " + fmtN(ult.litros, 1) + " L · " + fmtN(ult.km) + " km" : "nenhum"}</span>
    </div>
  );
}
const INSTR_ABAST = [
  "O abastecimento deverá ser realizado com o tanque cheio.",
  "O abastecimento termina quando a bomba disparar automaticamente.",
  "Após o primeiro disparo da bomba, não continuar abastecendo.",
  "Não completar após o disparo.",
  "Sempre abastecer antes de o combustível chegar à reserva.",
  "O ideal é abastecer quando o marcador atingir aproximadamente 1/4 do tanque.",
];
function InstrucoesAbastecimento() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"><Info size={13} /> Como abastecer corretamente?</button>
      {open && <ul className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">{INSTR_ABAST.map((t, i) => <li key={i} className="text-xs text-amber-900 flex gap-2"><CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {t}</li>)}</ul>}
    </div>
  );
}

/* ================= CUSTOS ================= */
function Custos({ data, save, user }) {
  const [edit, setEdit] = useState(null); const [fCat, setFCat] = useState(""); const [fV, setFV] = useState("");
  const editable = can(user, "custos", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const rows = allCostRows(data).filter((r) => (!fCat || r.categoria === fCat) && (!fV || r.veiculoId === fV)).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const yk = todayISO().slice(0, 4); const mk = todayISO().slice(0, 7);
  const custoMes = sumBy(rows.filter((r) => monthKey(r.data) === mk), (r) => r.valor);
  const custoAno = sumBy(rows.filter((r) => String(r.data).slice(0, 4) === yk), (r) => r.valor);
  const porVeic = data.vehicles.map((v) => { const t = sumBy(allCostRows(data).filter((r) => r.veiculoId === v.id && String(r.data).slice(0, 4) === yk), (r) => r.valor); const km = num(v.kmAtual); return { v, t, ckm: km > 0 ? t / km : 0 }; }).filter((x) => x.t > 0);
  const caros = [...porVeic].sort((a, b) => b.t - a.t);
  const economicos = [...porVeic].filter((x) => x.ckm > 0).sort((a, b) => a.ckm - b.ckm);

  const startNew = () => setEdit({ data: todayISO(), categoria: "", valor: "" });
  const submit = () => {
    if (!edit.categoria || !edit.valor) return;
    const list = edit.id ? data.costs.map((c) => c.id === edit.id ? edit : c) : [...data.costs, { ...edit, id: uid(), criadoEm: nowISO() }];
    save({ costs: list }, (edit.id ? "Editou" : "Lançou") + " custo · " + edit.categoria + " " + fmtBRL(edit.valor));
    setEdit(null);
  };
  const del = (c) => { if (!confirm("Remover este custo?")) return; save({ costs: data.costs.filter((x) => x.id !== c.id) }, "Removeu custo"); setEdit(null); };
  const isFuel = (r) => r.categoria === "Combustível" && !data.costs.find((c) => c.id === r.id);

  return (
    <div>
      <PageHead title="Controle de Custos" sub="Combustível é somado automaticamente a partir dos abastecimentos" actions={editable && <Btn onClick={startNew}><Plus size={16} /> Lançar custo</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI icon={Wallet} tone="royal" label="Custo no mês" value={fmtBRL(custoMes)} sub={monthLabel(mk)} />
        <KPI icon={TrendingUp} tone="amber" label="Custo no ano" value={fmtBRL(custoAno)} sub={yk} />
        <KPI icon={AlertTriangle} tone="red" label="Veículo mais caro" value={caros[0] ? caros[0].v.prefixo : "—"} sub={caros[0] ? fmtBRL(caros[0].t) : ""} />
        <KPI icon={CheckCircle2} tone="green" label="Mais econômico (R$/km)" value={economicos[0] ? economicos[0].v.prefixo : "—"} sub={economicos[0] ? fmtBRL(economicos[0].ckm) + "/km" : ""} />
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Sel value={fCat} onChange={(e) => setFCat(e.target.value)}><option value="">Todas as categorias</option>{CAT_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}</Sel>
        <Sel value={fV} onChange={(e) => setFV(e.target.value)}><option value="">Todos os veículos</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Sel>
      </div>
      <DataTable onRow={(r) => { if (editable && !isFuel(r)) setEdit(data.costs.find((c) => c.id === r.id)); }}
        empty="Nenhum custo lançado."
        cols={[
          { label: "Data", render: (r) => fmtD(r.data) },
          { label: "Categoria", render: (r) => <Badge tone={r.categoria === "Combustível" ? "blue" : "slate"}>{r.categoria}</Badge> },
          { label: "Veículo", render: (r) => vmap[r.veiculoId]?.prefixo || "Geral" },
          { label: "Descrição", render: (r) => <span className="text-slate-600 text-xs">{r.desc || "—"}</span> },
          { label: "Valor", right: true, render: (r) => <span className="font-bold">{fmtBRL(r.valor)}</span> },
        ]}
        rows={rows}
      />
      {edit && (
        <Modal title={edit.id ? "Editar custo" : "Lançar custo"} onClose={() => setEdit(null)}
          footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.categoria || !edit.valor}>Salvar</Btn></div></div>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Data" req><Inp type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></Field>
            <Field label="Categoria" req><Sel value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}><option value="">Selecione…</option>{CAT_CUSTO.filter((c) => c !== "Combustível").map((c) => <option key={c} value={c}>{c}</option>)}</Sel></Field>
            <Field label="Veículo"><Sel value={edit.veiculoId || ""} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value })}><option value="">Geral / não vinculado</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Sel></Field>
            <Field label="Valor" req><Inp type="number" step="0.01" value={edit.valor} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></Field>
            <Field label="Descrição" span={2}><Inp value={edit.descricao || ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= MANUTENÇÃO PREVENTIVA ================= */
function Manutencao({ data, save, user, alerts, onOS }) {
  const [tab, setTab] = useState("planos"); const [edit, setEdit] = useState(null); const [rec, setRec] = useState(null);
  const editable = can(user, "manut", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const preventivaAlerts = alerts.filter((a) => a.kind === "preventiva");

  const startPlan = () => setEdit({ ativo: true, item: "", veiculoId: "", intervaloKm: "", ultimaKm: "" });
  const submitPlan = () => {
    if (!edit.veiculoId || !edit.item) return;
    const list = edit.id ? data.plans.map((p) => p.id === edit.id ? edit : p) : [...data.plans, { ...edit, id: uid() }];
    save({ plans: list }, (edit.id ? "Editou" : "Criou") + " plano preventivo · " + edit.item);
    setEdit(null);
  };
  const delPlan = (p) => { if (!confirm("Remover este item do plano preventivo?")) return; save({ plans: data.plans.filter((x) => x.id !== p.id) }, "Removeu plano preventivo"); setEdit(null); };

  const startRec = () => setRec({ data: todayISO(), veiculoId: "", servicos: "", valor: "" });
  useEffect(() => { if (rec && rec.veiculoId && !rec.id) { const v = vmap[rec.veiculoId]; if (v) setRec((p) => ({ ...p, km: p.km || v.kmAtual, horimetro: p.horimetro || (v.usaHorimetro ? v.horimetro : "") })); } }, [rec && rec.veiculoId]);
  const submitRec = () => {
    if (!rec.veiculoId || !rec.servicos) return;
    const mrecords = [...data.mrecords, { ...rec, id: uid(), criadoEm: nowISO() }];
    let plans = data.plans;
    if (rec.planoId) plans = data.plans.map((p) => p.id === rec.planoId ? { ...p, ultimaKm: num(rec.km) || p.ultimaKm, ultimaHoras: num(rec.horimetro) || p.ultimaHoras, ultimaData: rec.data } : p);
    const costs = num(rec.valor) > 0 ? [...data.costs, { id: uid(), data: rec.data, categoria: "Oficina", veiculoId: rec.veiculoId, valor: num(rec.valor), descricao: "Preventiva: " + rec.servicos.slice(0, 60), criadoEm: nowISO() }] : data.costs;
    save({ mrecords, plans, costs }, "Registrou preventiva · " + (vmap[rec.veiculoId]?.prefixo || ""));
    setRec(null);
  };

  return (
    <div>
      <PageHead title="Manutenção Preventiva" sub="Planos automáticos por KM, horímetro e tempo" actions={editable && <div className="flex gap-2"><Btn v="sec" onClick={startRec}><Plus size={15} /> Registrar preventiva</Btn><Btn onClick={startPlan}><Plus size={16} /> Novo plano</Btn></div>} />
      <Tabs cur={tab} set={setTab} tabs={[["planos", "Planos ativos"], ["lub", "Lubrificação"], ["alertas", "Alertas (" + preventivaAlerts.length + ")"], ["hist", "Histórico"]]} />
      {tab === "planos" && (
        <>
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Legenda:</span>
          {[4, 3, 2, 1].map((k) => <span key={k} className="inline-flex items-center gap-1">{PLAN_COLORS[k][0]} {PLAN_COLORS[k][1]}</span>)}
        </div>
        {data.plans.length === 0 ? <Empty icon={Wrench} title="Nenhum plano preventivo" sub="Crie planos manualmente ou use a Leitura Inteligente do Manual (IA) para gerar o plano completo de um modelo automaticamente.">{editable && <Btn onClick={startPlan}><Plus size={16} /> Criar plano</Btn>}</Empty>
        : <DataTable onRow={editable ? setEdit : undefined}
            cols={[
              { label: "Situação", render: (p) => { if (p.ativo === false) return <Badge tone="slate">Inativo</Badge>; const c = planColor(p, vmap[p.veiculoId]); return c ? <span className="inline-flex items-center gap-1" title={PLAN_COLORS[c][1]}><span style={{ fontSize: 15 }}>{PLAN_COLORS[c][0]}</span><span className="text-xs font-semibold" style={{ color: PLAN_COLORS[c][2] }}>{PLAN_COLORS[c][1]}</span></span> : <Badge tone="green">Ativo</Badge>; } },
              { label: "Item", render: (p) => <span className="font-semibold">{p.item}{(p.oleo || p.filtro || p.fluido) && <span title="Possui especificação técnica"> 🔧</span>}</span> },
              { label: "Veículo", render: (p) => vmap[p.veiculoId]?.prefixo || "—" },
              { label: "Intervalo", render: (p) => [p.intervaloKm ? fmtN(p.intervaloKm) + " km" : null, p.intervaloHoras ? fmtN(p.intervaloHoras) + " h" : null, p.intervaloMeses ? p.intervaloMeses + " mês(es)" : null].filter(Boolean).join(" · ") || "—" },
              { label: "Última", render: (p) => [p.ultimaKm ? fmtN(p.ultimaKm) + " km" : null, p.ultimaData ? fmtD(p.ultimaData) : null].filter(Boolean).join(" · ") || "—" },
              { label: "Próxima (km)", right: true, render: (p) => p.intervaloKm ? fmtN(num(p.ultimaKm) + num(p.intervaloKm)) : "—" },
            ]}
            rows={[...data.plans].sort((a, b) => (planColor(a, vmap[a.veiculoId]) || 9) - (planColor(b, vmap[b.veiculoId]) || 9))}
          />}
        </>
      )}
      {tab === "lub" && <LubTab data={data} save={save} editable={editable} />}
      {tab === "alertas" && (
        preventivaAlerts.length === 0 ? <Empty icon={CheckCircle2} title="Nenhuma preventiva pendente" sub="Todos os planos estão dentro do intervalo." />
        : <div className="space-y-2">{preventivaAlerts.map((a) => <AlertCard key={a.id} a={a} onOS={onOS} canOS={can(user, "os", "edit")} />)}</div>
      )}
      {tab === "hist" && (
        data.mrecords.length === 0 ? <Empty icon={History} title="Sem histórico de preventivas" />
        : <DataTable onRow={editable ? (r) => setRec(data.mrecords.find((x) => x.id === r.id)) : undefined}
            cols={[
              { label: "Data", render: (r) => fmtD(r.data) },
              { label: "Veículo", render: (r) => vmap[r.veiculoId]?.prefixo || "—" },
              { label: "KM", right: true, render: (r) => fmtN(r.km) },
              { label: "Serviços", render: (r) => <span className="text-slate-600 text-xs">{r.servicos}</span> },
              { label: "Oficina", render: (r) => r.oficina || "—" },
              { label: "Valor", right: true, render: (r) => fmtBRL(r.valor) },
            ]}
            rows={[...data.mrecords].sort((a, b) => String(b.data).localeCompare(String(a.data)))}
          />
      )}
      {edit && (
        <Modal title={edit.id ? "Editar plano preventivo" : "Novo plano preventivo"} sub="Defina ao menos um intervalo (km, horas ou meses)" onClose={() => setEdit(null)}
          footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => delPlan(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submitPlan} disabled={!edit.veiculoId || !edit.item}>Salvar</Btn></div></div>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Item / serviço" req span={2}><Inp value={edit.item} onChange={(e) => setEdit({ ...edit, item: e.target.value })} placeholder="Ex.: Troca de óleo e filtros" /></Field>
            <Field label="Veículo" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value })}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
            <Field label="Ativo?" type="check"><label className="flex items-center gap-2 py-2.5"><input type="checkbox" checked={edit.ativo !== false} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Plano ativo</span></label></Field>
            <Field label="Intervalo por KM"><Inp type="number" value={edit.intervaloKm || ""} onChange={(e) => setEdit({ ...edit, intervaloKm: e.target.value })} placeholder="10000" /></Field>
            <Field label="Última troca (KM)"><Inp type="number" value={edit.ultimaKm || ""} onChange={(e) => setEdit({ ...edit, ultimaKm: e.target.value })} /></Field>
            <Field label="Intervalo por horas"><Inp type="number" value={edit.intervaloHoras || ""} onChange={(e) => setEdit({ ...edit, intervaloHoras: e.target.value })} /></Field>
            <Field label="Última troca (horas)"><Inp type="number" value={edit.ultimaHoras || ""} onChange={(e) => setEdit({ ...edit, ultimaHoras: e.target.value })} /></Field>
            <Field label="Intervalo por meses"><Inp type="number" value={edit.intervaloMeses || ""} onChange={(e) => setEdit({ ...edit, intervaloMeses: e.target.value })} /></Field>
            <Field label="Última troca (data)"><Inp type="date" value={edit.ultimaData || ""} onChange={(e) => setEdit({ ...edit, ultimaData: e.target.value })} /></Field>
          </div>
          <details className="mt-3 group" open={!!(edit.oleo || edit.filtro || edit.fluido || edit.graxa)}>
            <summary className="cursor-pointer text-xs font-bold text-slate-600 uppercase tracking-wide select-none">Especificação técnica (óleo, filtros, fluidos, torque)</summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Óleo recomendado"><Inp value={edit.oleo || ""} onChange={(e) => setEdit({ ...edit, oleo: e.target.value })} placeholder="15W40 CI-4" /></Field>
              <Field label="Quantidade de óleo"><Inp value={edit.qtdOleo || ""} onChange={(e) => setEdit({ ...edit, qtdOleo: e.target.value })} placeholder="12 L" /></Field>
              <Field label="Filtro a substituir"><Inp value={edit.filtro || ""} onChange={(e) => setEdit({ ...edit, filtro: e.target.value })} placeholder="Filtro de óleo" /></Field>
              <Field label="Código do filtro"><Inp value={edit.codFiltro || ""} onChange={(e) => setEdit({ ...edit, codFiltro: e.target.value })} placeholder="Ex.: P550xxx" /></Field>
              <Field label="Fluido recomendado"><Inp value={edit.fluido || ""} onChange={(e) => setEdit({ ...edit, fluido: e.target.value })} /></Field>
              <Field label="Quantidade do fluido"><Inp value={edit.qtdFluido || ""} onChange={(e) => setEdit({ ...edit, qtdFluido: e.target.value })} /></Field>
              <Field label="Graxa recomendada"><Inp value={edit.graxa || ""} onChange={(e) => setEdit({ ...edit, graxa: e.target.value })} /></Field>
              <Field label="Torque (quando houver)"><Inp value={edit.torque || ""} onChange={(e) => setEdit({ ...edit, torque: e.target.value })} placeholder="Ex.: 120 N·m" /></Field>
              <Field label="Componentes a inspecionar" span={2}><TA value={edit.componentes || ""} onChange={(e) => setEdit({ ...edit, componentes: e.target.value })} /></Field>
            </div>
          </details>
        </Modal>
      )}
      {rec && (
        <Modal title={rec.id ? "Editar preventiva" : "Registrar preventiva realizada"} sub="Ao salvar, o próximo intervalo do plano é atualizado automaticamente" onClose={() => setRec(null)}
          footer={<><Btn v="sec" onClick={() => setRec(null)}>Cancelar</Btn><Btn onClick={submitRec} disabled={!rec.veiculoId || !rec.servicos}>Salvar</Btn></>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Veículo" req><Sel value={rec.veiculoId} onChange={(e) => setRec({ ...rec, veiculoId: e.target.value })}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
            <Field label="Vincular ao plano"><Sel value={rec.planoId || ""} onChange={(e) => setRec({ ...rec, planoId: e.target.value })}><option value="">Nenhum</option>{data.plans.filter((p) => p.veiculoId === rec.veiculoId).map((p) => <option key={p.id} value={p.id}>{p.item}</option>)}</Sel></Field>
            <Field label="Data" req><Inp type="date" value={rec.data} onChange={(e) => setRec({ ...rec, data: e.target.value })} /></Field>
            <Field label="KM"><Inp type="number" value={rec.km || ""} onChange={(e) => setRec({ ...rec, km: e.target.value })} /></Field>
            <Field label="Serviços realizados" req span={2}><TA value={rec.servicos} onChange={(e) => setRec({ ...rec, servicos: e.target.value })} /></Field>
            <Field label="Oficina"><Inp value={rec.oficina || ""} onChange={(e) => setRec({ ...rec, oficina: e.target.value })} /></Field>
            <Field label="Mecânico"><Inp value={rec.mecanico || ""} onChange={(e) => setRec({ ...rec, mecanico: e.target.value })} /></Field>
            <Field label="Peças"><Inp value={rec.pecas || ""} onChange={(e) => setRec({ ...rec, pecas: e.target.value })} /></Field>
            <Field label="Valor (gera custo)"><Inp type="number" step="0.01" value={rec.valor || ""} onChange={(e) => setRec({ ...rec, valor: e.target.value })} /></Field>
            <Field label="Fotos do serviço" span={2}><PhotoInput label="Antes / depois" max={6} photos={rec.fotos || []} onChange={(ps) => setRec({ ...rec, fotos: ps })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= ORDEM DE SERVIÇO ================= */
function OrdensServico({ data, save, user, seedOS, clearSeed }) {
  const [edit, setEdit] = useState(null); const [fSt, setFSt] = useState("");
  const editable = can(user, "os", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  useEffect(() => { if (seedOS) { setEdit(seedOS); clearSeed(); } }, [seedOS]);

  const nextNum = () => "OS-" + String((data.settings.proxOS || 1)).padStart(5, "0");
  const startNew = () => setEdit({ numero: nextNum(), tipo: "Corretiva", prioridade: "media", status: "aberta", dataAbertura: todayISO(), veiculoId: "", servicos: "", pecas: [] });
  useEffect(() => { if (edit && edit.veiculoId && !edit.id) { const v = vmap[edit.veiculoId]; if (v) setEdit((p) => ({ ...p, km: p.km || v.kmAtual, horimetro: p.horimetro || (v.usaHorimetro ? v.horimetro : "") })); } }, [edit && edit.veiculoId]);

  const submit = () => {
    if (!edit.veiculoId || !edit.servicos) return;
    const isNew = !edit.id;
    const rec = { ...edit, id: edit.id || uid() };
    let settings = data.settings, costs = data.costs, plans = data.plans, vehicles = data.vehicles, mrecords = data.mrecords;
    if (isNew && !data.os.find((o) => o.numero === edit.numero)) settings = { ...data.settings, proxOS: (data.settings.proxOS || 1) + 1 };
    const wasConcluded = data.os.find((o) => o.id === edit.id)?.status === "concluida";
    if (edit.status === "concluida" && !wasConcluded) {
      rec.dataConclusao = rec.dataConclusao || todayISO();
      if (num(rec.valorTotal) > 0) costs = [...costs, { id: uid(), data: rec.dataConclusao, categoria: rec.tipo === "Preventiva" ? "Oficina" : "Peças", veiculoId: rec.veiculoId, valor: num(rec.valorTotal), descricao: rec.numero + ": " + rec.servicos.slice(0, 50), criadoEm: nowISO() }];
      if (rec.planoId) plans = plans.map((p) => p.id === rec.planoId ? { ...p, ultimaKm: num(rec.km) || p.ultimaKm, ultimaData: rec.dataConclusao } : p);
      mrecords = [...mrecords, { id: uid(), data: rec.dataConclusao, veiculoId: rec.veiculoId, km: rec.km, servicos: rec.servicos, oficina: rec.oficina, mecanico: rec.mecanico, valor: rec.valorTotal, origem: rec.numero }];
    }
    const list = edit.id ? data.os.map((o) => o.id === edit.id ? rec : o) : [...data.os, rec];
    save({ os: list, settings, costs, plans, vehicles, mrecords }, (isNew ? "Abriu " : "Atualizou ") + rec.numero + " · " + (vmap[rec.veiculoId]?.prefixo || ""));
    setEdit(null);
  };
  const del = (o) => { if (!confirm("Remover " + o.numero + "?")) return; save({ os: data.os.filter((x) => x.id !== o.id) }, "Removeu " + o.numero); setEdit(null); };
  const rows = [...data.os].filter((o) => !fSt || o.status === fSt).sort((a, b) => String(b.numero).localeCompare(String(a.numero)));

  return (
    <div>
      <PageHead title="Ordens de Serviço" sub={data.os.length + " OS · numeração automática"} actions={editable && <Btn onClick={startNew} disabled={!data.vehicles.length}><Plus size={16} /> Nova OS</Btn>} />
      <div className="mb-3"><Sel value={fSt} onChange={(e) => setFSt(e.target.value)}><option value="">Todos os status</option>{Object.entries(OS_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel></div>
      {data.os.length === 0 ? <Empty icon={ClipboardList} title="Nenhuma ordem de serviço" sub="Abra OS manualmente ou gere automaticamente a partir dos alertas de manutenção preventiva.">{editable && data.vehicles.length > 0 && <Btn onClick={startNew}><Plus size={16} /> Abrir primeira OS</Btn>}</Empty>
      : <DataTable onRow={editable ? setEdit : undefined}
          cols={[
            { label: "Nº", render: (o) => <span className="font-bold text-slate-900">{o.numero}</span> },
            { label: "Veículo", render: (o) => vmap[o.veiculoId]?.prefixo || "—" },
            { label: "Tipo", render: (o) => <Badge tone={o.tipo === "Preventiva" ? "blue" : "amber"}>{o.tipo}</Badge> },
            { label: "Abertura", render: (o) => fmtD(o.dataAbertura) },
            { label: "Prioridade", render: (o) => <Badge tone={PRIORIDADES[o.prioridade][1]}>{PRIORIDADES[o.prioridade][0]}</Badge> },
            { label: "Valor", right: true, render: (o) => o.valorTotal ? fmtBRL(o.valorTotal) : "—" },
            { label: "Status", render: (o) => <Badge tone={OS_STATUS[o.status][1]}>{OS_STATUS[o.status][0]}</Badge> },
          ]}
          rows={rows}
        />}
      {edit && (
        <Modal title={edit.id ? "Editar " + edit.numero : "Nova ordem de serviço · " + edit.numero} sub={vmap[edit.veiculoId] ? vmap[edit.veiculoId].prefixo + " · " + (vmap[edit.veiculoId].placa || "") : null} onClose={() => setEdit(null)} w="max-w-3xl"
          footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.veiculoId || !edit.servicos}>Salvar</Btn></div></div>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Veículo" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value })}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
            <Field label="Tipo"><Sel value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}><option>Corretiva</option><option>Preventiva</option></Sel></Field>
            <Field label="Prioridade"><Sel value={edit.prioridade} onChange={(e) => setEdit({ ...edit, prioridade: e.target.value })}>{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(OS_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel></Field>
            <Field label="Data de abertura"><Inp type="date" value={edit.dataAbertura} onChange={(e) => setEdit({ ...edit, dataAbertura: e.target.value })} /></Field>
            <Field label="KM"><Inp type="number" value={edit.km || ""} onChange={(e) => setEdit({ ...edit, km: e.target.value })} /></Field>
            <Field label="Serviços programados / executados" req span={2}><TA value={edit.servicos} onChange={(e) => setEdit({ ...edit, servicos: e.target.value })} /></Field>
            <Field label="Oficina"><Inp value={edit.oficina || ""} onChange={(e) => setEdit({ ...edit, oficina: e.target.value })} /></Field>
            <Field label="Mecânico / responsável técnico"><Inp value={edit.mecanico || ""} onChange={(e) => setEdit({ ...edit, mecanico: e.target.value })} /></Field>
            <Field label="Peças utilizadas"><Inp value={edit.pecasTexto || ""} onChange={(e) => setEdit({ ...edit, pecasTexto: e.target.value })} /></Field>
            <Field label="Valor total (gera custo ao concluir)"><Inp type="number" step="0.01" value={edit.valorTotal || ""} onChange={(e) => setEdit({ ...edit, valorTotal: e.target.value })} /></Field>
            {edit.status === "concluida" && <Field label="Data de conclusão"><Inp type="date" value={edit.dataConclusao || todayISO()} onChange={(e) => setEdit({ ...edit, dataConclusao: e.target.value })} /></Field>}
            <Field label="Observações" span={2}><TA value={edit.obs || ""} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} /></Field>
          </div>
          {edit.status !== "concluida" && num(edit.valorTotal) > 0 && <p className="text-[11px] text-slate-500 mt-2"><Info size={12} className="inline" /> O custo será lançado automaticamente quando a OS for marcada como <b>Concluída</b>.</p>}
        </Modal>
      )}
    </div>
  );
}

/* ================= PNEUS (reconstruído — padrão Prolog) ================= */
function Pneus({ data, save, user }) {
  const [tab, setTab] = useState("frota");
  const editable = can(user, "pneus", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const cfg = { ...DEF_ALERTCFG, ...(data.settings.alertCfg || {}) };
  const sulcoMin = num(cfg.sulcoMinimo) || 1.6;

  const [edit, setEdit] = useState(null);   // cadastro/edição do pneu
  const [mov, setMov] = useState(null);     // movimentação (montar/rodízio/recapar/descartar)
  const [wear, setWear] = useState(null);   // análise de desgaste
  const [view, setView] = useState(null);   // ficha completa do pneu

  const tires = data.tires;
  const emUso = tires.filter((t) => t.status === "em_uso");
  const estoque = tires.filter((t) => t.status === "estoque");
  const descartados = tires.filter((t) => t.status === "sucateado");

  /* ---- cadastro ---- */
  const startNew = () => setEdit({ status: "estoque", numeroFogo: "", dataCompra: todayISO(), vida: 1, historicoVidas: [], kmVida: 0, mmNovo: "", mmInicial: "" });
  const submit = () => {
    if (!edit.numeroFogo) return;
    if (tires.some((t) => t.id !== edit.id && String(t.numeroFogo).trim().toLowerCase() === String(edit.numeroFogo).trim().toLowerCase())) { alert("Já existe um pneu com este número de fogo."); return; }
    const rec = { ...edit, vida: num(edit.vida) || 1, mmInicial: edit.mmInicial || edit.mmNovo };
    const list = edit.id ? tires.map((t) => t.id === edit.id ? rec : t) : [...tires, { ...rec, id: uid(), criadoEm: nowISO() }];
    save({ tires: list }, (edit.id ? "Editou" : "Cadastrou") + " pneu fogo " + edit.numeroFogo);
    setEdit(null);
  };
  const del = (t) => { if (!confirm("Remover pneu fogo " + t.numeroFogo + "? O histórico de movimentações permanece registrado.")) return; save({ tires: tires.filter((x) => x.id !== t.id) }, "Removeu pneu " + t.numeroFogo); setEdit(null); setView(null); };

  /* ---- movimentação (registra histórico em tiremoves) ---- */
  const startMov = (tire, tipo) => {
    const base = { tireId: tire.id, data: todayISO(), responsavel: user.nome, tipo, kmMov: tire.status === "em_uso" && tire.veiculoId ? num(vmap[tire.veiculoId]?.kmAtual) : "", sulcos: {}, fotos: [] };
    if (tipo === "montar") base.veiculoId = emUso[0]?.veiculoId || "";
    setMov({ ...base, tire });
  };
  const doMov = () => {
    const t = mov.tire; if (!t) return;
    const moves = [...(data.tiremoves || [])];
    let rec = { ...t };
    const vmov = vmap[mov.veiculoId];
    const kmRodadoVida = kmVidaAtual(t, vmap);

    if (mov.tipo === "montar") {
      if (!mov.veiculoId || !mov.posicao) return;
      rec = { ...t, status: "em_uso", veiculoId: mov.veiculoId, posicao: mov.posicao, kmMontagem: num(mov.kmMov), dataMontagem: mov.data };
      moves.push(mvRec(mov, "Aplicação / montagem", "estoque", "", t.posicao, "aplicado", vmov?.prefixo, mov.posicao, kmRodadoVida));
    } else if (mov.tipo === "desmontar") {
      rec = { ...t, status: mov.destino || "estoque", kmVida: num(t.kmVida) + kmRodadoVida, veiculoId: "", posicao: "", kmMontagem: 0 };
      moves.push(mvRec(mov, mov.motivo || "Desmontagem", "aplicado", vmap[t.veiculoId]?.prefixo, t.posicao, mov.destino || "estoque", "", "", kmRodadoVida));
    } else if (mov.tipo === "rodizio") {
      if (!mov.posicao) return;
      moves.push(mvRec(mov, "Rodízio", "aplicado", vmap[t.veiculoId]?.prefixo, t.posicao, "aplicado", vmap[t.veiculoId]?.prefixo, mov.posicao, kmRodadoVida));
      rec = { ...t, posicao: mov.posicao };
    } else if (mov.tipo === "recapar") {
      // encerra a vida atual, inicia nova vida
      const hv = [...(t.historicoVidas || []), { vida: num(t.vida) || 1, km: kmRodadoVida, valorBanda: num(t.valorBanda), encerradaEm: mov.data, sulcoFinal: menorSulco(t) }];
      rec = { ...t, status: "estoque", vida: (num(t.vida) || 1) + 1, kmVida: 0, veiculoId: "", posicao: "", kmMontagem: 0, historicoVidas: hv, valorBanda: num(mov.valorBanda) || 0, recapadora: mov.recapadora || "", mmInicial: mov.mmNova || t.mmNovo, sulco_interno: "", sulco_centroInt: "", sulco_centroExt: "", sulco_externo: "" };
      moves.push(mvRec(mov, "Recapagem (nova vida)", "aplicado", vmap[t.veiculoId]?.prefixo, t.posicao, "recapagem", "", "", kmRodadoVida));
    } else if (mov.tipo === "descartar") {
      const hv = [...(t.historicoVidas || []), { vida: num(t.vida) || 1, km: kmRodadoVida, valorBanda: num(t.valorBanda), encerradaEm: mov.data, sulcoFinal: menorSulco(t) }];
      rec = { ...t, status: "sucateado", kmVida: num(t.kmVida) + kmRodadoVida, historicoVidas: hv, veiculoId: "", posicao: "", kmMontagem: 0, descarte: { data: mov.data, responsavel: mov.responsavel, motivo: mov.motivoDescarte, aparencia: mov.aparencia, obs: mov.obs, fotos: mov.fotos || [] } };
      moves.push(mvRec(mov, "Descarte: " + (mov.motivoDescarte || ""), "aplicado", vmap[t.veiculoId]?.prefixo, t.posicao, "descarte", "", "", kmRodadoVida));
    }
    save({ tires: tires.map((x) => x.id === t.id ? rec : x), tiremoves: moves }, mvLog(mov.tipo, t, vmov));
    setMov(null);
  };
  const mvRec = (mov, motivo, orig, placaO, posO, dest, placaD, posD, km) => ({
    id: uid(), tireId: mov.tire.id, numeroFogo: mov.tire.numeroFogo, data: mov.data, responsavel: mov.responsavel, tipo: mov.tipo,
    motivo, origem: orig, placaOrigem: placaO || "", posicaoOrigem: posO || "", destino: dest, placaDestino: placaD || "", posicaoDestino: posD || "",
    kmMov: num(mov.kmMov), kmVida: km, recapadora: mov.recapadora || "", custoServicos: num(mov.valorBanda) || num(mov.custoServicos) || 0,
    obs: mov.obs || "", vida: num(mov.tire.vida) || 1, criadoEm: nowISO(),
  });
  const mvLog = (tipo, t, v) => ({ montar: "Montou", desmontar: "Desmontou", rodizio: "Rodízio do", recapar: "Enviou p/ recapagem", descartar: "Descartou" }[tipo] + " pneu " + t.numeroFogo + (v ? " · " + v.prefixo : ""));

  /* ---- análise de desgaste ---- */
  const submitWear = () => {
    if (!wear.pneuId || !(wear.tipos || []).length) return;
    save({ wear: [...data.wear, { ...wear, id: uid(), criadoEm: nowISO() }] }, "Registrou desgaste · pneu " + (tires.find((t) => t.id === wear.pneuId)?.numeroFogo || ""));
    setWear(null);
  };

  const movsOf = (tid) => (data.tiremoves || []).filter((m) => m.tireId === tid).sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));

  return (
    <div>
      <PageHead title="Gestão de Pneus" sub={tires.length + " pneu(s) · " + emUso.length + " aplicados · " + estoque.length + " em estoque"} actions={<div className="flex gap-2 items-center"><HelpButton topic="inspecao" />{editable && <><Btn v="sec" onClick={() => setWear({ data: todayISO(), tipos: [] })} disabled={!emUso.length}><CircleDot size={15} /> Desgaste</Btn><Btn onClick={startNew}><Plus size={16} /> Novo pneu</Btn></>}</div>} />
      <Tabs cur={tab} set={setTab} tabs={[["frota", "Todos (" + tires.length + ")"], ["uso", "Aplicados (" + emUso.length + ")"], ["estoque", "Estoque (" + estoque.length + ")"], ["previsao", "Previsão de troca"], ["desgaste", "Desgaste"], ["mov", "Movimentações"], ["descarte", "Descartados (" + descartados.length + ")"]]} />

      {(tab === "frota" || tab === "uso" || tab === "estoque") && (() => {
        const rows = tab === "uso" ? emUso : tab === "estoque" ? estoque : tires;
        return rows.length === 0 ? <Empty icon={CircleDot} title="Nenhum pneu nesta aba" sub="Cadastre pneus por número de fogo para controlar vidas, sulcos, CPK, rodízio, recapagem e descarte.">{editable && <Btn onClick={startNew}><Plus size={16} /> Cadastrar pneu</Btn>}</Empty>
        : <DataTable onRow={setView}
            cols={[
              { label: "Fogo", render: (t) => <span className="font-bold">{t.numeroFogo}</span> },
              { label: "Vida", render: (t) => <Badge tone={num(t.vida) > 1 ? "amber" : "blue"}>{num(t.vida) || 1}ª</Badge> },
              { label: "Marca / Medida", render: (t) => <span className="text-slate-600 text-xs">{[t.marca, t.medida].filter(Boolean).join(" · ") || "—"}</span> },
              { label: "Aplicação", render: (t) => t.status === "em_uso" ? <span className="text-xs">{vmap[t.veiculoId]?.prefixo || "—"} · <b>{t.posicao || "?"}</b></span> : "—" },
              { label: "Menor sulco", right: true, render: (t) => { const s = menorSulco(t); return s == null ? "—" : <Badge tone={s < sulcoMin ? "red" : s < sulcoMin * 1.6 ? "amber" : "green"}>{fmtN(s, 1)} mm</Badge>; } },
              { label: "KM vida", right: true, render: (t) => fmtN(kmVidaAtual(t, vmap)) },
              { label: "CPK", right: true, render: (t) => { const c = cpkVidaAtual(t, vmap); return c ? fmtBRL(c) : "—"; } },
              { label: "Status", render: (t) => <Badge tone={TIRE_STATUS[t.status][1]}>{TIRE_STATUS[t.status][0]}</Badge> },
            ]}
            rows={rows}
          />;
      })()}

      {tab === "previsao" && (() => {
        const base = emUso.map((t) => ({ t, prev: previsaoTroca(t, vmap, sulcoMin), menor: menorSulco(t) })).filter((x) => x.menor != null)
          .sort((a, b) => (a.prev.kmRestante || 0) - (b.prev.kmRestante || 0));
        return base.length === 0 ? <Empty icon={TrendingUp} title="Sem dados de previsão" sub="Registre inspeções de sulco nos pneus aplicados para o sistema calcular a previsão de troca." />
        : <DataTable cols={[
            { label: "Fogo", render: (x) => <span className="font-bold">{x.t.numeroFogo}</span> },
            { label: "Veículo/Pos.", render: (x) => (vmap[x.t.veiculoId]?.prefixo || "—") + " · " + (x.t.posicao || "?") },
            { label: "Menor sulco", right: true, render: (x) => <Badge tone={x.menor < sulcoMin ? "red" : x.menor < sulcoMin * 1.6 ? "amber" : "green"}>{fmtN(x.menor, 1)} mm</Badge> },
            { label: "KM/mm", right: true, render: (x) => { const k = kmPorMm(x.t, vmap); return k ? fmtN(k) : "—"; } },
            { label: "KM a rodar", right: true, render: (x) => x.prev.prazo ? <Badge tone="red">{x.prev.prazo}</Badge> : fmtN(x.prev.kmRestante) },
          ]} rows={base} />;
      })()}

      {tab === "desgaste" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" /><span>Registre o padrão de desgaste. O sistema sugere causas prováveis (alinhamento, balanceamento, calibragem, suspensão, carga). Use <b>IA › Diagnóstico de pneus</b> para um parecer técnico.</span></div>
          {data.wear.length === 0 ? <Empty icon={CircleDot} title="Nenhuma análise registrada" sub="Registre desgastes dos pneus aplicados.">{editable && emUso.length > 0 && <Btn onClick={() => setWear({ data: todayISO(), tipos: [] })}><Plus size={16} /> Registrar desgaste</Btn>}</Empty>
          : <div className="space-y-2">
              {[...data.wear].sort((a, b) => String(b.data).localeCompare(String(a.data))).map((w) => {
                const t = tires.find((x) => x.id === w.pneuId);
                const causas = [...new Set((w.tipos || []).flatMap((tp) => CAUSAS_DESGASTE[tp] || []))];
                return (
                  <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2"><Badge tone="navy">Fogo {t?.numeroFogo || "?"}</Badge><span className="text-xs text-slate-500">{fmtD(w.data)}{t?.veiculoId ? " · " + (vmap[t.veiculoId]?.prefixo || "") + " pos. " + (t.posicao || "?") : ""}</span></div>
                      <div className="flex gap-1 flex-wrap">{(w.tipos || []).map((tp) => <Badge key={tp} tone="amber">{DESGASTES[tp]}</Badge>)}</div>
                    </div>
                    {causas.length > 0 && <div className="mt-2 text-xs text-slate-600"><span className="font-bold text-slate-700">Causas prováveis: </span>{causas.join(" · ")}</div>}
                    {w.obs && <p className="text-xs text-slate-500 mt-1">{w.obs}</p>}
                  </div>
                );
              })}
            </div>}
        </div>
      )}

      {tab === "mov" && (
        (data.tiremoves || []).length === 0 ? <Empty icon={ArrowRightLeft} title="Nenhuma movimentação registrada" sub="Montagem, rodízio, recapagem e descarte aparecem aqui com origem, destino, motivo e KM." />
        : <DataTable cols={[
            { label: "Data", render: (m) => fmtD(m.data) },
            { label: "Fogo", render: (m) => <span className="font-semibold">{m.numeroFogo}</span> },
            { label: "Movimentação", render: (m) => m.motivo },
            { label: "Origem", render: (m) => [m.placaOrigem, m.posicaoOrigem].filter(Boolean).join(" · ") || TIRE_STATUS[m.origem]?.[0] || m.origem || "—" },
            { label: "Destino", render: (m) => [m.placaDestino, m.posicaoDestino].filter(Boolean).join(" · ") || TIRE_STATUS[m.destino]?.[0] || m.destino || "—" },
            { label: "KM", right: true, render: (m) => fmtN(m.kmMov) },
            { label: "Resp.", render: (m) => m.responsavel || "—" },
          ]} rows={[...(data.tiremoves || [])].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)))} />
      )}

      {tab === "descarte" && (
        descartados.length === 0 ? <Empty icon={Trash2} title="Nenhum pneu descartado" sub="Pneus que chegaram ao fim da vida útil aparecem aqui com motivo, custo acumulado e CPK final." />
        : <DataTable onRow={setView} cols={[
            { label: "Fogo", render: (t) => <span className="font-bold">{t.numeroFogo}</span> },
            { label: "Vidas", render: (t) => (num(t.vida) || 1) + "ª" },
            { label: "Motivo", render: (t) => t.descarte?.motivo || "—" },
            { label: "Data", render: (t) => fmtD(t.descarte?.data) },
            { label: "KM total", right: true, render: (t) => fmtN(kmAcumuladoTotal(t, vmap)) },
            { label: "CPK final", right: true, render: (t) => { const c = cpkAcumulado(t, vmap); return c ? fmtBRL(c) : "—"; } },
          ]} rows={descartados} />
      )}

      {/* ---- modal cadastro ---- */}
      {edit && (
        <Modal title={edit.id ? "Editar pneu fogo " + edit.numeroFogo : "Novo pneu"} onClose={() => setEdit(null)} w="max-w-3xl"
          footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.numeroFogo}>Salvar</Btn></div></div>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Número de fogo" req><Inp value={edit.numeroFogo} onChange={(e) => setEdit({ ...edit, numeroFogo: e.target.value })} /></Field>
            <Field label="Status"><Sel value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(TIRE_STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</Sel></Field>
            <Field label="Vida atual"><Sel value={edit.vida || 1} onChange={(e) => setEdit({ ...edit, vida: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{vidaLabel(n)}</option>)}</Sel></Field>
            <TireCatalogPicker value={{ marcaId: edit.marcaId, modeloId: edit.modeloId, medidaId: edit.medidaId }}
              onChange={(patch) => setEdit((p) => {
                const next = { ...p, ...patch };
                // mantém os nomes em texto sincronizados (compatibilidade + relatórios)
                if (patch.marcaId !== undefined) next.marca = brandName(data, patch.marcaId);
                if (patch.modeloId !== undefined) next.modelo = modelName(data, patch.modeloId);
                if (patch.medidaId !== undefined) next.medida = sizeName(data, patch.medidaId);
                return next;
              })} data={data} save={save} />
            <Field label="DOT"><Inp value={edit.dot || ""} onChange={(e) => setEdit({ ...edit, dot: e.target.value })} /></Field>
            <Field label="Nº de série"><Inp value={edit.serie || ""} onChange={(e) => setEdit({ ...edit, serie: e.target.value })} /></Field>
            <Field label="Nota fiscal"><Inp value={edit.nf || ""} onChange={(e) => setEdit({ ...edit, nf: e.target.value })} /></Field>
            <Field label="Valor de aquisição"><Inp type="number" step="0.01" value={edit.valor || ""} onChange={(e) => setEdit({ ...edit, valor: e.target.value })} /></Field>
            <Field label="Data de compra"><Inp type="date" value={edit.dataCompra || ""} onChange={(e) => setEdit({ ...edit, dataCompra: e.target.value })} /></Field>
            <Field label="Sulco novo (mm)" hint="Profundidade de fábrica"><Inp type="number" step="0.1" value={edit.mmNovo || ""} onChange={(e) => setEdit({ ...edit, mmNovo: e.target.value })} placeholder="16" /></Field>
            <Field label="Pressão ideal (PSI)"><Inp type="number" value={edit.pressaoIdeal || ""} onChange={(e) => setEdit({ ...edit, pressaoIdeal: e.target.value })} /></Field>
            <Field label="Vida útil estimada (km)"><Inp type="number" value={edit.vidaUtilKm || ""} onChange={(e) => setEdit({ ...edit, vidaUtilKm: e.target.value })} placeholder="120000" /></Field>
          </div>
          {num(edit.vida) > 1 && <div className="mt-3"><Field label="Valor da banda (recapagem atual)"><Inp type="number" step="0.01" value={edit.valorBanda || ""} onChange={(e) => setEdit({ ...edit, valorBanda: e.target.value })} /></Field></div>}
        </Modal>
      )}

      {/* ---- modal movimentação ---- */}
      {mov && <PneuMovModal mov={mov} setMov={setMov} doMov={doMov} data={data} vmap={vmap} />}

      {/* ---- modal desgaste ---- */}
      {wear && (
        <Modal title="Registrar análise de desgaste" onClose={() => setWear(null)}
          footer={<><Btn v="sec" onClick={() => setWear(null)}>Cancelar</Btn><Btn onClick={submitWear} disabled={!wear.pneuId || !(wear.tipos || []).length}>Salvar</Btn></>}>
          <div className="space-y-3">
            <Field label="Pneu (aplicado)" req><Sel value={wear.pneuId || ""} onChange={(e) => setWear({ ...wear, pneuId: e.target.value })}><option value="">Selecione…</option>{emUso.map((t) => <option key={t.id} value={t.id}>Fogo {t.numeroFogo} · {vmap[t.veiculoId]?.prefixo} pos. {t.posicao}</option>)}</Sel></Field>
            <Field label="Data"><Inp type="date" value={wear.data} onChange={(e) => setWear({ ...wear, data: e.target.value })} /></Field>
            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Padrões observados <span className="text-red-500">*</span></span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(DESGASTES).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-2.5 py-1.5 cursor-pointer border border-slate-200">
                    <input type="checkbox" checked={(wear.tipos || []).includes(k)} onChange={(e) => { const s = new Set(wear.tipos || []); e.target.checked ? s.add(k) : s.delete(k); setWear({ ...wear, tipos: [...s] }); }} className="w-4 h-4" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Aparência"><Sel value={wear.aparencia || ""} onChange={(e) => setWear({ ...wear, aparencia: e.target.value })}><option value="">—</option>{APARENCIA.map((a) => <option key={a} value={a}>{a}</option>)}</Sel></Field>
            {(wear.tipos || []).length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900"><b>Causas prováveis:</b> {[...new Set((wear.tipos || []).flatMap((tp) => CAUSAS_DESGASTE[tp] || []))].join(" · ")}</div>}
            <Field label="Observações"><TA value={wear.obs || ""} onChange={(e) => setWear({ ...wear, obs: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {/* ---- ficha completa do pneu ---- */}
      {view && <PneuFicha t={view} data={data} vmap={vmap} movs={movsOf(view.id)} editable={editable} sulcoMin={sulcoMin}
        onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} onMov={(tp) => { startMov(view, tp); setView(null); }} />}
    </div>
  );
}

/* ---- Modal de movimentação (montar / rodízio / recapar / desmontar / descartar) ---- */
function PneuMovModal({ mov, setMov, doMov, data, vmap }) {
  const t = mov.tire;
  const posDestino = mov.veiculoId ? posicoesDe(vmap[mov.veiculoId], data) : (t.veiculoId ? posicoesDe(vmap[t.veiculoId], data) : []);
  const titulos = { montar: "Aplicar pneu (montagem)", desmontar: "Desmontar pneu", rodizio: "Rodízio de posição", recapar: "Enviar para recapagem", descartar: "Descartar pneu" };
  const set = (k, v) => setMov({ ...mov, [k]: v });
  const ok = mov.tipo === "montar" ? (mov.veiculoId && mov.posicao) : mov.tipo === "rodizio" ? mov.posicao : mov.tipo === "descartar" ? mov.motivoDescarte : true;
  return (
    <Modal title={titulos[mov.tipo] + " · fogo " + t.numeroFogo} onClose={() => setMov(null)}
      footer={<><Btn v="sec" onClick={() => setMov(null)}>Cancelar</Btn><Btn onClick={doMov} disabled={!ok}>Confirmar</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Data"><Inp type="date" value={mov.data} onChange={(e) => set("data", e.target.value)} /></Field>
        <Field label="Responsável"><Inp value={mov.responsavel || ""} onChange={(e) => set("responsavel", e.target.value)} /></Field>
        {mov.tipo === "montar" && <>
          <Field label="Veículo" req><Sel value={mov.veiculoId || ""} onChange={(e) => set("veiculoId", e.target.value)}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
          <Field label="Posição" req><Sel value={mov.posicao || ""} onChange={(e) => set("posicao", e.target.value)}><option value="">Selecione…</option>{posDestino.map((p) => <option key={p} value={p}>{p}</option>)}</Sel></Field>
          <Field label="KM na montagem"><Inp type="number" value={mov.kmMov || ""} onChange={(e) => set("kmMov", e.target.value)} /></Field>
        </>}
        {mov.tipo === "rodizio" && <>
          <Field label="Nova posição" req><Sel value={mov.posicao || ""} onChange={(e) => set("posicao", e.target.value)}><option value="">Selecione…</option>{posDestino.filter((p) => p !== t.posicao).map((p) => <option key={p} value={p}>{p}</option>)}</Sel></Field>
          <Field label="KM atual"><Inp type="number" value={mov.kmMov || ""} onChange={(e) => set("kmMov", e.target.value)} /></Field>
        </>}
        {mov.tipo === "desmontar" && <>
          <Field label="Destino"><Sel value={mov.destino || "estoque"} onChange={(e) => set("destino", e.target.value)}><option value="estoque">Estoque</option><option value="analise">Em análise</option><option value="conserto">Conserto</option></Sel></Field>
          <Field label="Motivo"><Sel value={mov.motivo || ""} onChange={(e) => set("motivo", e.target.value)}><option value="">—</option>{MOV_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}</Sel></Field>
          <Field label="KM atual"><Inp type="number" value={mov.kmMov || ""} onChange={(e) => set("kmMov", e.target.value)} /></Field>
        </>}
        {mov.tipo === "recapar" && <>
          <Field label="Recapadora"><Inp value={mov.recapadora || ""} onChange={(e) => set("recapadora", e.target.value)} /></Field>
          <Field label="Valor da banda (R$)"><Inp type="number" step="0.01" value={mov.valorBanda || ""} onChange={(e) => set("valorBanda", e.target.value)} /></Field>
          <Field label="Sulco novo da banda (mm)"><Inp type="number" step="0.1" value={mov.mmNova || ""} onChange={(e) => set("mmNova", e.target.value)} /></Field>
          <Field label="KM atual"><Inp type="number" value={mov.kmMov || ""} onChange={(e) => set("kmMov", e.target.value)} /></Field>
          <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900"><Info size={13} className="inline" /> Ao recapar, a vida atual é encerrada (KM e custo registrados) e o pneu passa para a <b>{(num(t.vida) || 1) + 1}ª vida</b>.</div>
        </>}
        {mov.tipo === "descartar" && <>
          <Field label="Motivo do descarte" req><Sel value={mov.motivoDescarte || ""} onChange={(e) => set("motivoDescarte", e.target.value)}><option value="">Selecione…</option>{DESCARTE_MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}</Sel></Field>
          <Field label="Aparência"><Sel value={mov.aparencia || ""} onChange={(e) => set("aparencia", e.target.value)}><option value="">—</option>{APARENCIA.map((a) => <option key={a} value={a}>{a}</option>)}</Sel></Field>
          <Field label="Fotos do descarte" span={2}><PhotoInput label="Evidência" max={3} photos={mov.fotos || []} onChange={(ps) => set("fotos", ps)} /></Field>
        </>}
        <Field label="Observações" span={2}><TA value={mov.obs || ""} onChange={(e) => set("obs", e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* ---- Ficha completa do pneu (vidas, sulcos, CPK, histórico) ---- */
function PneuFicha({ t, data, vmap, movs, editable, sulcoMin, onClose, onEdit, onMov }) {
  const km = kmVidaAtual(t, vmap); const kmTot = kmAcumuladoTotal(t, vmap);
  const cpk = cpkVidaAtual(t, vmap); const cpkAc = cpkAcumulado(t, vmap);
  const menor = menorSulco(t); const prev = previsaoTroca(t, vmap, sulcoMin);
  const aplicado = t.status === "em_uso"; const descartado = t.status === "sucateado";
  const info = [
    ["Status", TIRE_STATUS[t.status][0]], ["Vida atual", vidaLabel(num(t.vida) || 1)],
    ["Marca / Modelo", [t.marca, t.modelo].filter(Boolean).join(" ") || "—"], ["Medida", t.medida || "—"],
    ["DOT", t.dot || "—"], ["Nota fiscal", t.nf || "—"],
    ...(aplicado ? [["Aplicado em", (vmap[t.veiculoId]?.prefixo || "") + " · pos. " + (t.posicao || "?")]] : []),
  ];
  return (
    <Modal title={"Pneu fogo " + t.numeroFogo} sub={[t.marca, t.medida].filter(Boolean).join(" · ")} onClose={onClose} w="max-w-3xl"
      footer={editable && <div className="flex flex-wrap gap-2 justify-end w-full">
        {t.status === "estoque" && <Btn sm onClick={() => onMov("montar")}><ArrowRightLeft size={13} /> Aplicar</Btn>}
        {aplicado && <><Btn sm v="sec" onClick={() => onMov("rodizio")}>Rodízio</Btn><Btn sm v="sec" onClick={() => onMov("desmontar")}>Desmontar</Btn></>}
        {!descartado && <Btn sm v="sec" onClick={() => onMov("recapar")}>Recapar</Btn>}
        {!descartado && <Btn sm v="dan" onClick={() => onMov("descartar")}>Descartar</Btn>}
        <Btn sm v="sec" onClick={onEdit}><Pencil size={13} /> Editar</Btn>
      </div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <KPI icon={Gauge} tone="navy" label="Menor sulco" value={menor != null ? fmtN(menor, 1) + " mm" : "—"} sub={t.mmNovo ? "novo: " + t.mmNovo + " mm" : ""} />
          <KPI icon={ArrowRightLeft} tone="royal" label="KM vida atual" value={fmtN(km)} sub={"total: " + fmtN(kmTot)} />
          <KPI icon={Wallet} tone="amber" label="CPK vida" value={cpk ? fmtBRL(cpk) : "—"} sub={cpkAc ? "acum.: " + fmtBRL(cpkAc) : ""} />
          <KPI icon={TrendingUp} tone="green" label="Previsão troca" value={prev.prazo || (prev.kmRestante ? fmtN(prev.kmRestante) + " km" : "—")} />
        </div>
        {aplicado && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase">Sulcos medidos (mm)</h4>
            <div className="grid grid-cols-4 gap-2">
              {SULCOS_POS.map(([k, lbl]) => <div key={k} className="bg-slate-50 rounded-lg p-2 text-center"><span className="block text-[10px] text-slate-400 uppercase">{lbl}</span><span className="font-bold text-slate-800">{num(t["sulco_" + k]) || "—"}</span></div>)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Medições registradas via <b>Pneus › inspeção</b> ou módulo de Inspeção.</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50 rounded-xl p-4">
          {info.map(([k, v]) => <div key={k} className="flex justify-between text-sm border-b border-slate-100 py-1"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span></div>)}
        </div>
        {(t.historicoVidas || []).length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase">Vidas anteriores</h4>
            <div className="space-y-1">{t.historicoVidas.map((h, i) => <div key={i} className="flex justify-between text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"><span>{vidaLabel(h.vida)}</span><span className="text-slate-500">{fmtN(h.km)} km{h.valorBanda ? " · banda " + fmtBRL(h.valorBanda) : ""}{h.sulcoFinal != null ? " · sulco final " + fmtN(h.sulcoFinal, 1) + "mm" : ""}</span></div>)}</div>
          </div>
        )}
        {descartado && t.descarte && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <h4 className="text-xs font-bold text-red-700 mb-1 uppercase">Descarte</h4>
            <p className="text-sm text-slate-700"><b>Motivo:</b> {t.descarte.motivo} · {fmtD(t.descarte.data)} · {t.descarte.responsavel}</p>
            {t.descarte.obs && <p className="text-xs text-slate-500 mt-1">{t.descarte.obs}</p>}
            {(t.descarte.fotos || []).length > 0 && <div className="mt-2"><PhotoStrip photos={t.descarte.fotos} onZoom={() => {}} /></div>}
          </div>
        )}
        {movs.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 uppercase">Histórico de movimentações</h4>
            <div className="space-y-1">{movs.map((m) => <div key={m.id} className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"><span className="text-slate-400">{fmtD(m.data)}</span><span className="font-semibold flex-1">{m.motivo}</span>{m.kmMov ? <span className="text-slate-500">{fmtN(m.kmMov)} km</span> : null}</div>)}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ================= INTELIGÊNCIA ARTIFICIAL ================= */
function IA({ data, save, user }) {
  const [tab, setTab] = useState("insights");
  return (
    <div>
      <PageHead title="Inteligência Artificial" sub="Análise da base, leitura de manual e diagnóstico de pneus" />
      <Tabs cur={tab} set={setTab} tabs={[["insights", "Insights gerenciais"], ["manual", "Leitura do manual"], ["pneu", "Diagnóstico de pneus"]]} />
      {tab === "insights" && <IAInsights data={data} />}
      {tab === "manual" && <IAManual data={data} save={save} />}
      {tab === "pneu" && <IAPneu data={data} />}
    </div>
  );
}
function IAInsights({ data }) {
  const [loading, setLoading] = useState(false); const [out, setOut] = useState(null); const [err, setErr] = useState("");
  const run = async () => {
    setLoading(true); setErr(""); setOut(null);
    try {
      const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
      const rows = allCostRows(data);
      const yk = todayISO().slice(0, 4);
      const { medias } = fuelStats(data.fuel, data.vehicles);
      const alertas = buildAlerts(data);
      const lastCalib = {}; (data.calibrations || []).forEach((c) => { if (!lastCalib[c.veiculoId] || c.data > lastCalib[c.veiculoId].data) lastCalib[c.veiculoId] = c; });
      const lastInsp = {}; (data.inspections || []).forEach((c) => { if (!lastInsp[c.veiculoId] || c.data > lastInsp[c.veiculoId].data) lastInsp[c.veiculoId] = c; });
      const resumo = {
        frotas: data.vehicles.map((v) => ({
          prefixo: v.prefixo, status: v.status, km: num(v.kmAtual),
          custoAno: Math.round(sumBy(rows.filter((r) => r.veiculoId === v.id && String(r.data).slice(0, 4) === yk), (r) => r.valor)),
          mediaKmL: medias[v.id] ? +medias[v.id].toFixed(2) : null,
          ultimaCalibragem: lastCalib[v.id]?.data || null,
          ultimaInspecao: lastInsp[v.id]?.data || null,
          menorSulco: lastInsp[v.id] ? Math.min(...(lastInsp[v.id].medicoes || []).flatMap((m) => (m.sulcos || []).map(num)).filter((x) => x > 0), 99) : null,
          desgasteIrregular: data.wear.some((w) => { const t = data.tires.find((x) => x.id === w.pneuId); return t && t.veiculoId === v.id && (w.tipos || []).length; }),
          manutencoesAno: data.mrecords.filter((m) => m.veiculoId === v.id && String(m.data).slice(0, 4) === yk).length,
          osAbertas: data.os.filter((o) => o.veiculoId === v.id && o.status !== "concluida" && o.status !== "cancelada").length,
          centroCusto: v.centroCusto, contrato: v.contrato, regional: v.regional,
        })),
        custoPorCategoria: CAT_CUSTO.map((c) => ({ c, v: Math.round(sumBy(rows.filter((r) => r.categoria === c), (r) => r.valor)) })).filter((x) => x.v > 0),
        alertasAtivos: alertas.reduce((a, x) => { a[x.kind] = (a[x.kind] || 0) + 1; return a; }, {}),
      };
      const prompt = "Você é o GERENTE VIRTUAL de gestão de frotas da Kairos Telecom — não um chatbot, mas um analista técnico que CRUZA informações para encontrar causas-raiz. Analise os dados reais e, ao identificar um problema (ex.: consumo elevado), verifique fatores relacionados (calibragem atrasada, desgaste irregular, sulco baixo, manutenção em atraso, OS abertas) antes de concluir. Para equipamentos que quebram muito, relacione custo, OS abertas e manutenções. Português do Brasil.\n\nDADOS:\n" + JSON.stringify(resumo) + "\n\nResponda APENAS com JSON válido, sem texto fora, no formato:\n{\"resumo\":\"2-3 frases (parecer geral)\",\"insights\":[{\"nivel\":\"alto|medio|info\",\"titulo\":\"curto\",\"detalhe\":\"hipótese com cruzamento de dados e número concreto\",\"frota\":\"prefixo se aplicável\"}],\"economias\":[\"ação preventiva concreta\"]}\nGere de 4 a 7 insights (priorize cruzamentos, não fatos isolados) e 2 a 4 economias. Baseie-se somente nos dados fornecidos.";
      const r = await askAI(prompt, true);
      setOut(r);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3"><div className="p-2 rounded-lg" style={{ background: BRAND.sky, color: BRAND.royal }}><Bot size={20} /></div><div><h3 className="font-bold text-slate-800 text-sm">Gerente Virtual da Frota</h3><p className="text-xs text-slate-500 max-w-md">A IA cruza consumo, calibragem, desgaste, inspeções, manutenções e OS para encontrar causas-raiz e sugerir ações preventivas.</p></div></div>
        <Btn onClick={run} disabled={loading || !data.vehicles.length}>{loading ? <Spin label="Analisando…" /> : <><Sparkles size={16} /> Gerar parecer</>}</Btn>
      </div>
      {!data.vehicles.length && <Empty icon={Bot} title="Sem dados para analisar" sub="Cadastre veículos e lance abastecimentos/custos para a IA analisar sua frota." />}
      {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {err}</div>}
      {out && (
        <div className="space-y-3">
          {out.resumo && <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-900">{out.resumo}</div>}
          <div className="grid gap-2">
            {(out.insights || []).map((i, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3.5 relative overflow-hidden pl-4">
                <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: i.nivel === "alto" ? BRAND.red : i.nivel === "medio" ? BRAND.amber : BRAND.royal }} />
                <div className="flex items-center gap-2 mb-1"><Badge tone={i.nivel === "alto" ? "red" : i.nivel === "medio" ? "amber" : "blue"}>{i.nivel}</Badge><span className="font-bold text-sm text-slate-900">{i.titulo}</span>{i.frota && <Badge tone="navy">{i.frota}</Badge>}</div>
                <p className="text-xs text-slate-600">{i.detalhe}</p>
              </div>
            ))}
          </div>
          {(out.economias || []).length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="font-bold text-emerald-900 text-sm mb-2 flex items-center gap-1.5"><TrendingUp size={15} /> Oportunidades de economia</h4>
              <ul className="space-y-1">{out.economias.map((e, i) => <li key={i} className="text-xs text-emerald-800 flex gap-2"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /> {e}</li>)}</ul>
            </div>
          )}
          <p className="text-[11px] text-slate-400 text-center">Insights gerados por IA a partir dos seus dados. Valide antes de decisões críticas.</p>
        </div>
      )}
    </div>
  );
}
function IAManual({ data, save }) {
  const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [plano, setPlano] = useState(null);
  const [veiculoId, setVeiculoId] = useState(""); const [modelo, setModelo] = useState(""); const fileRef = useRef();
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));

  const readPdf = async (file) => {
    setLoading(true); setErr(""); setPlano(null);
    try {
      const dataUrl = await fileToDataURL(file);
      const b64 = String(dataUrl).split(",")[1];
      const content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: "Você é um engenheiro de manutenção. Leia este manual do fabricante e extraia TODAS as manutenções preventivas E os pontos de lubrificação. Responda APENAS com JSON válido, sem texto fora dele, no formato:\n{\"modelo\":\"modelo identificado\",\"itens\":[{\"item\":\"nome do serviço\",\"intervaloKm\":numero_ou_null,\"intervaloHoras\":numero_ou_null,\"intervaloMeses\":numero_ou_null,\"oleo\":\"tipo/viscosidade ou null\",\"qtdOleo\":\"ex 12 L ou null\",\"filtro\":\"nome ou null\",\"codFiltro\":\"código ou null\",\"fluido\":\"nome ou null\",\"qtdFluido\":\"ex 2 L ou null\",\"graxa\":\"tipo ou null\",\"torque\":\"ex 120 N·m ou null\",\"componentes\":\"componentes a inspecionar ou null\"}],\"lubrificacao\":[{\"componente\":\"ex: Lubrificação da lança\",\"lubrificante\":\"tipo de graxa/óleo\",\"periodicidade\":\"ex: a cada 50h\",\"quantidade\":\"ex: 3 bicos\"}]}\nInclua trocas de óleo do motor, filtros (ar, óleo, combustível, cabine, hidráulico), fluidos, correias, velas, e todos os pontos de graxa/lubrificação citados. Use null quando não se aplica. Português do Brasil." },
      ];
      const r = await askAI(content, true);
      setPlano(r); if (r.modelo && !modelo) setModelo(r.modelo);
    } catch (e) { setErr(e.message || "Não foi possível ler o manual. Verifique se é um PDF legível."); } finally { setLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const ativar = () => {
    if (!plano || !veiculoId) return;
    const v = vmap[veiculoId];
    const lub = (plano.lubrificacao || []).map((l) => ({ ...l }));
    const novos = (plano.itens || []).map((it, idx) => ({
      id: uid(), item: it.item, veiculoId, intervaloKm: it.intervaloKm || "", intervaloHoras: it.intervaloHoras || "", intervaloMeses: it.intervaloMeses || "",
      oleo: it.oleo || "", qtdOleo: it.qtdOleo || "", filtro: it.filtro || "", codFiltro: it.codFiltro || "", fluido: it.fluido || "", qtdFluido: it.qtdFluido || "", graxa: it.graxa || "", torque: it.torque || "", componentes: it.componentes || "",
      lubPontos: idx === 0 ? lub : undefined,
      ultimaKm: num(v?.kmAtual), ultimaData: todayISO(), ativo: true, origem: "manual-ia",
    }));
    save({ plans: [...data.plans, ...novos] }, "Ativou plano preventivo por IA (" + novos.length + " itens" + (lub.length ? ", " + lub.length + " pontos de lubrificação" : "") + ") · " + (v?.prefixo || ""));
    setPlano(null); setVeiculoId("");
    alert(novos.length + " itens de manutenção" + (lub.length ? " e " + lub.length + " pontos de lubrificação" : "") + " adicionados ao veículo.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg" style={{ background: BRAND.sky, color: BRAND.royal }}><FileUp size={20} /></div><div><h3 className="font-bold text-slate-800 text-sm">Leitura inteligente do manual (PDF)</h3><p className="text-xs text-slate-500 max-w-lg">Anexe o manual do fabricante em PDF. A IA identifica as manutenções preventivas, intervalos (km, horas, tempo) e peças, e monta o plano completo para você revisar e ativar.</p></div></div>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files[0] && readPdf(e.target.files[0])} />
        <Btn v="sec" onClick={() => fileRef.current?.click()} disabled={loading}>{loading ? <Spin label="Lendo o manual…" /> : <><FileUp size={16} /> Anexar manual em PDF</>}</Btn>
      </div>
      {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {err}</div>}
      {plano && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="font-bold text-slate-800">Plano identificado {plano.modelo ? "· " + plano.modelo : ""}</h4>
            <Badge tone="green">{(plano.itens || []).length} itens</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead><tr className="text-left text-[11px] uppercase text-slate-500 border-b"><th className="py-2 pr-2">Item</th><th className="py-2 px-2 text-right">KM</th><th className="py-2 px-2 text-right">Horas</th><th className="py-2 px-2 text-right">Meses</th><th className="py-2 pl-2">Especificação técnica</th></tr></thead>
              <tbody>{(plano.itens || []).map((it, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2 pr-2 font-semibold text-slate-800">{it.item}</td><td className="py-2 px-2 text-right">{it.intervaloKm ? fmtN(it.intervaloKm) : "—"}</td><td className="py-2 px-2 text-right">{it.intervaloHoras || "—"}</td><td className="py-2 px-2 text-right">{it.intervaloMeses || "—"}</td><td className="py-2 pl-2 text-xs text-slate-500">{[it.oleo && ("Óleo " + it.oleo + (it.qtdOleo ? " (" + it.qtdOleo + ")" : "")), it.filtro && ("Filtro " + it.filtro + (it.codFiltro ? " [" + it.codFiltro + "]" : "")), it.fluido && ("Fluido " + it.fluido), it.graxa && ("Graxa " + it.graxa), it.torque && ("Torque " + it.torque)].filter(Boolean).join(" · ") || "—"}</td></tr>)}</tbody>
            </table>
          </div>
          {(plano.lubrificacao || []).length > 0 && <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5"><b>Pontos de lubrificação identificados:</b> {(plano.lubrificacao || []).map((l) => l.componente).join(" · ")}</div>}
          <div className="flex items-end gap-2 flex-wrap border-t border-slate-100 pt-3">
            <div className="flex-1 min-w-[200px]"><Field label="Aplicar ao veículo" req><Sel value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field></div>
            <Btn onClick={ativar} disabled={!veiculoId}><CheckCircle2 size={16} /> Revisar e ativar plano</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
function IAPneu({ data }) {
  const [pneuId, setPneuId] = useState(""); const [loading, setLoading] = useState(false); const [out, setOut] = useState(null); const [err, setErr] = useState("");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const comDesgaste = data.tires.filter((t) => data.wear.some((w) => w.pneuId === t.id) || menorSulco(t) != null);
  const run = async () => {
    setLoading(true); setErr(""); setOut(null);
    try {
      const t = data.tires.find((x) => x.id === pneuId);
      const wears = data.wear.filter((w) => w.pneuId === pneuId).sort((a, b) => String(b.data).localeCompare(String(a.data)));
      const info = {
        fogo: t.numeroFogo, medida: t.medida, marca: t.marca, vida: num(t.vida) || 1,
        kmVidaAtual: kmVidaAtual(t, vmap), kmAcumulado: kmAcumuladoTotal(t, vmap), vidaUtilEstimada: t.vidaUtilKm,
        veiculo: vmap[t.veiculoId]?.prefixo, posicao: t.posicao,
        sulcoNovo: t.mmNovo, menorSulco: menorSulco(t), sulcos: { interno: t.sulco_interno, centroInt: t.sulco_centroInt, centroExt: t.sulco_centroExt, externo: t.sulco_externo },
        kmPorMm: kmPorMm(t, vmap), cpkVida: +cpkVidaAtual(t, vmap).toFixed(4), cpkAcumulado: +cpkAcumulado(t, vmap).toFixed(4),
        pressaoAtual: t.pressaoAtual, pressaoIdeal: t.pressaoIdeal,
        desgastes: wears.map((w) => ({ data: w.data, padroes: (w.tipos || []).map((x) => DESGASTES[x]), aparencia: w.aparencia, obs: w.obs })),
      };
      const prompt = "Você é um especialista técnico em pneus de frota pesada. Faça um diagnóstico cruzando os dados: compare o sulco INTERNO vs EXTERNO (diferença grande indica desalinhamento/cambagem), o desgaste central vs ombros (indica calibragem alta/baixa), a pressão atual vs ideal, o CPK (custo por km — quanto maior, pior o aproveitamento) e os padrões de desgaste observados. Responda APENAS com JSON válido:\n{\"diagnostico\":\"análise técnica em 2-3 frases citando os números\",\"causas\":[{\"causa\":\"ex: desalinhamento (convergência)\",\"probabilidade\":\"alta|média|baixa\"}],\"acoes\":[\"correção recomendada\"],\"urgencia\":\"alta|media|baixa\",\"vidaRestante\":\"estimativa em km ou %\"}\nDADOS:\n" + JSON.stringify(info) + "\nPortuguês do Brasil.";
      const r = await askAI(prompt, true); setOut(r);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3 mb-3"><div className="p-2 rounded-lg" style={{ background: BRAND.sky, color: BRAND.royal }}><CircleDot size={20} /></div><div><h3 className="font-bold text-slate-800 text-sm">Diagnóstico inteligente de pneus</h3><p className="text-xs text-slate-500">Selecione um pneu com desgaste registrado para receber diagnóstico técnico, causas prováveis, ações corretivas e vida útil restante estimada.</p></div></div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[220px]"><Field label="Pneu com desgaste registrado"><Sel value={pneuId} onChange={(e) => { setPneuId(e.target.value); setOut(null); }}><option value="">Selecione…</option>{comDesgaste.map((t) => <option key={t.id} value={t.id}>Fogo {t.numeroFogo} {t.veiculoId ? "· " + (vmap[t.veiculoId]?.prefixo || "") : ""}</option>)}</Sel></Field></div>
          <Btn onClick={run} disabled={!pneuId || loading}>{loading ? <Spin label="Diagnosticando…" /> : <><Sparkles size={16} /> Diagnosticar</>}</Btn>
        </div>
        {comDesgaste.length === 0 && <p className="text-xs text-slate-400 mt-2">Nenhum pneu com desgaste registrado. Registre análises de desgaste na aba Pneus.</p>}
      </div>
      {err && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {err}</div>}
      {out && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2"><h4 className="font-bold text-slate-800 text-sm">Diagnóstico</h4><Badge tone={out.urgencia === "alta" ? "red" : out.urgencia === "media" ? "amber" : "green"}>Urgência {out.urgencia}</Badge></div>
            <p className="text-sm text-slate-700">{out.diagnostico}</p>
            {out.vidaRestante && <p className="text-xs text-slate-500 mt-2"><b>Vida útil restante estimada:</b> {out.vidaRestante}</p>}
          </div>
          {(out.causas || []).length > 0 && <div className="bg-white rounded-xl border border-slate-200 p-4"><h4 className="font-bold text-slate-800 text-sm mb-2">Causas prováveis</h4><div className="space-y-1.5">{out.causas.map((c, i) => <div key={i} className="flex items-center justify-between text-sm"><span className="text-slate-700">{c.causa}</span><Badge tone={c.probabilidade === "alta" ? "red" : c.probabilidade === "média" ? "amber" : "slate"}>{c.probabilidade}</Badge></div>)}</div></div>}
          {(out.acoes || []).length > 0 && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><h4 className="font-bold text-emerald-900 text-sm mb-2">Ações corretivas</h4><ul className="space-y-1">{out.acoes.map((a, i) => <li key={i} className="text-xs text-emerald-800 flex gap-2"><CheckCircle2 size={13} className="shrink-0 mt-0.5" /> {a}</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}

/* ================= RELATÓRIOS ================= */
function Relatorios({ data }) {
  const [tipo, setTipo] = useState("custos"); const [de, setDe] = useState(todayISO().slice(0, 4) + "-01-01"); const [ate, setAte] = useState(todayISO());
  const [fV, setFV] = useState(""); const [fCat, setFCat] = useState(""); const [fContrato, setFContrato] = useState(""); const [fRegional, setFRegional] = useState(""); const [fCC, setFCC] = useState("");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const vn = (id) => vmap[id]?.prefixo || "—";
  const inRange = (d) => d >= de && d <= ate;
  const { enriched } = fuelStats(data.fuel, data.vehicles);
  const contratos = [...new Set(data.vehicles.map((v) => v.contrato).filter(Boolean))];
  const regionais = [...new Set(data.vehicles.map((v) => v.regional).filter(Boolean))];
  const centros = [...new Set(data.vehicles.map((v) => v.centroCusto).filter(Boolean))];
  // filtro por atributos do veículo
  const matchV = (vid) => { const v = vmap[vid]; if (!v && (fContrato || fRegional || fCC)) return false; return (!fV || vid === fV) && (!fContrato || v?.contrato === fContrato) && (!fRegional || v?.regional === fRegional) && (!fCC || v?.centroCusto === fCC); };

  const defs = {
    frota: { label: "Frotas", cols: [{ k: "prefixo", label: "Prefixo" }, { k: "placa", label: "Placa", render: (r) => r.placa || "—", csv: (r) => r.placa || "" }, { k: "modelo", label: "Modelo", render: (r) => [r.marca, r.modelo].filter(Boolean).join(" "), csv: (r) => [r.marca, r.modelo].filter(Boolean).join(" ") }, { k: "contrato", label: "Contrato", render: (r) => r.contrato || "—", csv: (r) => r.contrato || "" }, { k: "regional", label: "Regional", render: (r) => r.regional || "—", csv: (r) => r.regional || "" }, { k: "status", label: "Status", render: (r) => STATUS_VEIC[r.status][0], csv: (r) => STATUS_VEIC[r.status][0] }], rows: data.vehicles.filter((v) => matchV(v.id)), totalKey: null },
    custos: { label: "Custos", cols: [{ k: "data", label: "Data", render: (r) => fmtD(r.data), csv: (r) => fmtD(r.data) }, { k: "categoria", label: "Categoria" }, { k: "veic", label: "Frota", render: (r) => vn(r.veiculoId), csv: (r) => vn(r.veiculoId) }, { k: "desc", label: "Descrição" }, { k: "valor", label: "Valor", right: true, render: (r) => fmtBRL(r.valor), csv: (r) => String(r.valor).replace(".", ",") }], rows: allCostRows(data).filter((r) => inRange(r.data) && matchV(r.veiculoId) && (!fCat || r.categoria === fCat)).sort((a, b) => String(b.data).localeCompare(String(a.data))), totalKey: "valor" },
    abast: { label: "Abastecimentos", cols: [{ k: "data", label: "Data", render: (r) => fmtD(r.data), csv: (r) => fmtD(r.data) }, { k: "veic", label: "Frota", render: (r) => vn(r.veiculoId), csv: (r) => vn(r.veiculoId) }, { k: "motorista", label: "Motorista" }, { k: "km", label: "KM", right: true, render: (r) => fmtN(r.km), csv: (r) => r.km }, { k: "litros", label: "Litros", right: true, render: (r) => fmtN(r.litros, 1), csv: (r) => r.litros }, { k: "kml", label: "km/l", right: true, render: (r) => enriched[r.id]?.kml ? fmtN(enriched[r.id].kml, 2) : "—", csv: (r) => enriched[r.id]?.kml ? enriched[r.id].kml.toFixed(2) : "" }, { k: "valorTotal", label: "Valor", right: true, render: (r) => fmtBRL(r.valorTotal), csv: (r) => String(r.valorTotal).replace(".", ",") }], rows: data.fuel.filter((r) => inRange(r.data) && matchV(r.veiculoId)).sort((a, b) => String(b.data).localeCompare(String(a.data))), totalKey: "valorTotal" },
    manut: { label: "Manutenções", cols: [{ k: "data", label: "Data", render: (r) => fmtD(r.data), csv: (r) => fmtD(r.data) }, { k: "veic", label: "Frota", render: (r) => vn(r.veiculoId), csv: (r) => vn(r.veiculoId) }, { k: "servicos", label: "Serviços" }, { k: "oficina", label: "Oficina" }, { k: "valor", label: "Valor", right: true, render: (r) => fmtBRL(r.valor), csv: (r) => String(r.valor).replace(".", ",") }], rows: data.mrecords.filter((r) => inRange(r.data) && matchV(r.veiculoId)).sort((a, b) => String(b.data).localeCompare(String(a.data))), totalKey: "valor" },
    pneus: { label: "Pneus", cols: [{ k: "numeroFogo", label: "Fogo" }, { k: "vida", label: "Vida", render: (r) => (num(r.vida) || 1) + "ª", csv: (r) => (num(r.vida) || 1) }, { k: "marca", label: "Marca" }, { k: "medida", label: "Medida" }, { k: "veic", label: "Frota", render: (r) => r.status === "em_uso" ? vn(r.veiculoId) : "—", csv: (r) => r.status === "em_uso" ? vn(r.veiculoId) : "" }, { k: "pos", label: "Pos.", render: (r) => r.posicao || "—", csv: (r) => r.posicao || "" }, { k: "sulco", label: "Menor sulco", right: true, render: (r) => { const s = menorSulco(r); return s == null ? "—" : fmtN(s, 1) + " mm"; }, csv: (r) => menorSulco(r) ?? "" }, { k: "km", label: "KM rodado", right: true, render: (r) => fmtN(tireKm(r, vmap)), csv: (r) => Math.round(tireKm(r, vmap)) }, { k: "cpk", label: "CPK", right: true, render: (r) => { const c = cpkAcumulado(r, vmap); return c ? fmtBRL(c) : "—"; }, csv: (r) => cpkAcumulado(r, vmap).toFixed(4) }, { k: "status", label: "Status", render: (r) => TIRE_STATUS[r.status][0], csv: (r) => TIRE_STATUS[r.status][0] }], rows: data.tires.filter((r) => !fV || r.veiculoId === fV), totalKey: null },
    checklist: { label: "Checklist", cols: [{ k: "data", label: "Data", render: (r) => fmtD(r.data), csv: (r) => fmtD(r.data) }, { k: "veic", label: "Frota", render: (r) => r.prefixo || vn(r.veiculoId), csv: (r) => r.prefixo || vn(r.veiculoId) }, { k: "usuario", label: "Responsável" }, { k: "km", label: "KM", right: true, render: (r) => fmtN(r.km), csv: (r) => r.km }, { k: "nc", label: "Não conformes", right: true, render: (r) => r.ncCount || 0, csv: (r) => r.ncCount || 0 }], rows: (data.checklists || []).filter((r) => inRange(r.data) && matchV(r.veiculoId)).sort((a, b) => String(b.data).localeCompare(String(a.data))), totalKey: null },
    calibragem: { label: "Calibragens", cols: [{ k: "data", label: "Data", render: (r) => fmtD(r.data), csv: (r) => fmtD(r.data) }, { k: "veic", label: "Frota", render: (r) => vn(r.veiculoId), csv: (r) => vn(r.veiculoId) }, { k: "responsavel", label: "Responsável" }, { k: "pos", label: "Pneus", render: (r) => Object.keys(r.pressoes || {}).filter((k) => r.pressoes[k]).length, csv: (r) => Object.keys(r.pressoes || {}).filter((k) => r.pressoes[k]).length }], rows: (data.calibrations || []).filter((r) => inRange(r.data) && matchV(r.veiculoId)).sort((a, b) => String(b.data).localeCompare(String(a.data))), totalKey: null },
  };
  const cur = defs[tipo];
  const total = cur.totalKey ? sumBy(cur.rows, (r) => num(r[cur.totalKey])) : null;

  const exportCSV = () => downloadFile("kairos_frota_" + tipo + "_" + de + "_a_" + ate + ".csv", toCSV(cur.cols, cur.rows), "text/csv");
  const exportPDF = () => {
    const w = window.open("", "_blank"); if (!w) { alert("Permita pop-ups para gerar o PDF."); return; }
    const th = cur.cols.map((c) => "<th style='text-align:" + (c.right ? "right" : "left") + "'>" + c.label + "</th>").join("");
    const tr = cur.rows.map((r) => "<tr>" + cur.cols.map((c) => "<td style='text-align:" + (c.right ? "right" : "left") + "'>" + (c.csv ? c.csv(r) : (r[c.k] ?? "")) + "</td>").join("") + "</tr>").join("");
    w.document.write("<html><head><meta charset='utf-8'><title>Relatório " + cur.label + "</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#17203A}h1{color:#16266B;font-size:18px;margin:0 0 2px}p.sub{color:#666;font-size:12px;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#16266B;color:#fff;padding:6px 8px}td{padding:5px 8px;border-bottom:1px solid #eee}tfoot td{font-weight:bold;border-top:2px solid #16266B}.hd{display:flex;align-items:center;gap:12px;margin-bottom:12px}</style></head><body><div class='hd'><img src='" + LOGO + "' style='height:44px'/><div><h1>Relatório de " + cur.label + "</h1><p class='sub'>Kairos Frota · Período " + fmtD(de) + " a " + fmtD(ate) + " · " + cur.rows.length + " registro(s)</p></div></div><table><thead><tr>" + th + "</tr></thead><tbody>" + tr + "</tbody>" + (total !== null ? "<tfoot><tr><td colspan='" + (cur.cols.length - 1) + "'>TOTAL</td><td style='text-align:right'>" + fmtBRL(total) + "</td></tr></tfoot>" : "") + "</table></body></html>");
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  return (
    <div>
      <PageHead title="Central de Relatórios" sub="Exporte em PDF ou Excel (CSV) com filtros" actions={<div className="flex gap-2"><Btn v="sec" onClick={exportCSV}><Download size={15} /> Excel (CSV)</Btn><Btn onClick={exportPDF}><Printer size={15} /> PDF</Btn></div>} />
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Relatório"><Sel value={tipo} onChange={(e) => setTipo(e.target.value)}>{Object.entries(defs).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Sel></Field>
        <Field label="De"><Inp type="date" value={de} onChange={(e) => setDe(e.target.value)} /></Field>
        <Field label="Até"><Inp type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></Field>
        <Field label="Frota"><Sel value={fV} onChange={(e) => setFV(e.target.value)}><option value="">Todas</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Sel></Field>
        {contratos.length > 0 && <Field label="Contrato"><Sel value={fContrato} onChange={(e) => setFContrato(e.target.value)}><option value="">Todos</option>{contratos.map((c) => <option key={c} value={c}>{c}</option>)}</Sel></Field>}
        {regionais.length > 0 && <Field label="Regional"><Sel value={fRegional} onChange={(e) => setFRegional(e.target.value)}><option value="">Todas</option>{regionais.map((c) => <option key={c} value={c}>{c}</option>)}</Sel></Field>}
        {centros.length > 0 && <Field label="Centro de custo"><Sel value={fCC} onChange={(e) => setFCC(e.target.value)}><option value="">Todos</option>{centros.map((c) => <option key={c} value={c}>{c}</option>)}</Sel></Field>}
        {tipo === "custos" && <Field label="Categoria"><Sel value={fCat} onChange={(e) => setFCat(e.target.value)}><option value="">Todas</option>{CAT_CUSTO.map((c) => <option key={c} value={c}>{c}</option>)}</Sel></Field>}
      </div>
      {total !== null && <div className="mb-3"><KPI icon={Wallet} tone="navy" label={"Total · " + cur.label} value={fmtBRL(total)} sub={cur.rows.length + " registro(s) no período"} /></div>}
      <DataTable cols={cur.cols} rows={cur.rows} empty="Nenhum registro no período/filtro selecionado." />
    </div>
  );
}

/* ================= NOTIFICAÇÕES ================= */
function Notificacoes({ alerts, onOS, user, go }) {
  const [f, setF] = useState("todos");
  const kinds = { todos: "Todos", preventiva: "Preventivas", calibragem: "Calibragem", inspecao: "Inspeção", pneu: "Pneus", checklist: "Checklist", doc: "Documentos", consumo: "Consumo" };
  const rows = alerts.filter((a) => f === "todos" || a.kind === f);
  const counts = { critico: 0, alto: 0, medio: 0, info: 0 }; alerts.forEach((a) => counts[a.nivel]++);
  return (
    <div>
      <PageHead title="Central de Notificações" sub={alerts.length + " alerta(s) ativo(s)"} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI icon={AlertTriangle} tone="red" label="Críticos" value={counts.critico} />
        <KPI icon={Bell} tone="amber" label="Altos" value={counts.alto} />
        <KPI icon={Clock} tone="royal" label="Médios" value={counts.medio} />
        <KPI icon={Info} tone="navy" label="Informativos" value={counts.info} />
      </div>
      <Tabs cur={f} set={setF} tabs={Object.entries(kinds)} />
      {rows.length === 0 ? <Empty icon={CheckCircle2} title="Nenhum alerta neste filtro" sub="Frota em dia para o critério selecionado." />
      : <div className="space-y-2">{rows.map((a) => <AlertCard key={a.id} a={a} onOS={onOS} canOS={can(user, "os", "edit")} />)}</div>}
    </div>
  );
}

/* ================= USUÁRIOS ================= */
function Usuarios({ data, save, user }) {
  const [edit, setEdit] = useState(null); const [tab, setTab] = useState("lista");
  const startNew = () => setEdit({ perfil: "operacional", ativo: true, nome: "", login: "", senha: "" });
  const submit = () => {
    if (!edit.nome || !edit.login || (!edit.id && !edit.senhaPlain)) return;
    if (data.users.some((u) => u.login.toLowerCase() === edit.login.toLowerCase() && u.id !== edit.id)) { alert("Já existe um usuário com este login."); return; }
    const rec = { ...edit }; if (edit.senhaPlain) rec.senha = enc(edit.senhaPlain); delete rec.senhaPlain;
    const list = edit.id ? data.users.map((u) => u.id === edit.id ? rec : u) : [...data.users, { ...rec, id: uid(), criadoEm: nowISO() }];
    save({ users: list }, (edit.id ? "Editou" : "Criou") + " usuário " + edit.nome);
    setEdit(null);
  };
  const del = (u) => { if (u.id === user.id) { alert("Você não pode remover o próprio usuário."); return; } if (!confirm("Remover usuário " + u.nome + "?")) return; save({ users: data.users.filter((x) => x.id !== u.id) }, "Removeu usuário " + u.nome); setEdit(null); };
  return (
    <div>
      <PageHead title="Usuários e Permissões" sub={data.users.length + " usuário(s) · controle de acesso por perfil"} actions={tab === "lista" && <Btn onClick={startNew}><Plus size={16} /> Novo usuário</Btn>} />
      <Tabs cur={tab} set={setTab} tabs={[["lista", "Usuários"], ["perm", "Matriz de permissões"]]} />
      {tab === "perm" ? <PermMatrix data={data} save={save} /> : <>
      <DataTable onRow={setEdit}
        cols={[
          { label: "Nome", render: (u) => <span className="font-semibold">{u.nome}</span> },
          { label: "Login", k: "login" },
          { label: "Perfil", render: (u) => <Badge tone="navy">{PERFIS[u.perfil]}</Badge> },
          { label: "Situação", render: (u) => u.ativo === false ? <Badge tone="slate">Inativo</Badge> : <Badge tone="green">Ativo</Badge> },
        ]}
        rows={data.users}
      />
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">O que cada perfil acessa (padrão)</h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-600">
          <div><b className="text-slate-800">Administrador</b> — acesso total, gerencia usuários e permissões.</div>
          <div><b className="text-slate-800">Gestor</b> — visualiza tudo, aprova serviços, relatórios e indicadores.</div>
          <div><b className="text-slate-800">Oficina</b> — manutenção, OS, pneus e checklists.</div>
          <div><b className="text-slate-800">Técnico de manutenção</b> — preventivas, OS, histórico; conclui OS.</div>
          <div><b className="text-slate-800">Operacional</b> — apenas checklist e abastecimento (registros próprios).</div>
          <div><b className="text-slate-800">Motorista</b> — checklist e abastecimento.</div>
          <div><b className="text-slate-800">Somente leitura</b> — visualiza, sem editar.</div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Ajuste fino em <b>Matriz de permissões</b>.</p>
      </div>
      {edit && (
        <Modal title={edit.id ? "Editar usuário" : "Novo usuário"} onClose={() => setEdit(null)}
          footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit}>Salvar</Btn></div></div>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome completo" req span={2}><Inp value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
            <Field label="Login" req><Inp value={edit.login} onChange={(e) => setEdit({ ...edit, login: e.target.value.replace(/\s/g, "") })} /></Field>
            <Field label="Perfil" req><Sel value={edit.perfil} onChange={(e) => setEdit({ ...edit, perfil: e.target.value })}>{Object.entries(PERFIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Sel></Field>
            <Field label={edit.id ? "Nova senha (deixe em branco p/ manter)" : "Senha"} req={!edit.id}><Inp type="password" value={edit.senhaPlain || ""} onChange={(e) => setEdit({ ...edit, senhaPlain: e.target.value })} placeholder={edit.id ? "••••••" : ""} /></Field>
            <Field label="Vencimento da CNH (motoristas)"><Inp type="date" value={edit.cnhVenc || ""} onChange={(e) => setEdit({ ...edit, cnhVenc: e.target.value })} /></Field>
            <Field label="Ativo" type="check"><label className="flex items-center gap-2 py-2.5"><input type="checkbox" checked={edit.ativo !== false} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Usuário ativo</span></label></Field>
          </div>
          {edit.perfil === "operacional" && <p className="text-[11px] text-slate-500 mt-2"><Info size={12} className="inline" /> Perfil Operacional acessa somente Checklist e Abastecimento, com seus próprios registros.</p>}
        </Modal>
      )}
      </>}
    </div>
  );
}

/* ================= AUDITORIA ================= */
function Auditoria({ data }) {
  const [q, setQ] = useState("");
  const rows = [...data.audit].reverse().filter((a) => !q || (a.acao + " " + a.usuario).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHead title="Histórico e Auditoria" sub="Registro imutável de todas as ações · nenhum log é apagado" />
      <div className="relative mb-3 max-w-md"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className={inpCls + " pl-9"} placeholder="Buscar por ação ou usuário…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {data.audit.length === 0 ? <Empty icon={History} title="Sem registros de auditoria ainda" sub="Cada criação, edição e remoção fica registrada aqui com usuário, data e hora." />
      : <DataTable
          cols={[
            { label: "Data / hora", render: (a) => fmtDT(a.ts) },
            { label: "Usuário", render: (a) => <span className="font-semibold">{a.usuario}</span> },
            { label: "Perfil", render: (a) => <Badge tone="slate">{PERFIS[a.perfil] || a.perfil}</Badge> },
            { label: "Ação", render: (a) => <span className="text-slate-600">{a.acao}</span> },
          ]}
          rows={rows.slice(0, 400)}
        />}
      {rows.length > 400 && <p className="text-xs text-slate-400 mt-2 text-center">Exibindo os 400 registros mais recentes de {rows.length}.</p>}
    </div>
  );
}
/* ================= LUBRIFICAÇÃO INTELIGENTE ================= */
function LubTab({ data, save, editable }) {
  const [zoom, setZoom] = useState(null); const [edit, setEdit] = useState(null);
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  // agrega pontos de lubrificação de todos os planos
  const pontos = [];
  data.plans.forEach((p) => (p.lubPontos || []).forEach((l, i) => pontos.push({ ...l, planoId: p.id, idx: i, veiculoId: p.veiculoId })));
  const startAdd = () => setEdit({ componente: "", lubrificante: "", periodicidade: "", quantidade: "", veiculoId: "", img: [] });
  const submit = () => {
    if (!edit.componente || !edit.veiculoId) return;
    // anexa a um plano "Lubrificação" do veículo (cria se não existir)
    let plans = [...data.plans];
    let plano = plans.find((p) => p.veiculoId === edit.veiculoId && p.item === "Lubrificação");
    const ponto = { componente: edit.componente, lubrificante: edit.lubrificante, periodicidade: edit.periodicidade, quantidade: edit.quantidade, img: edit.img || [] };
    if (!plano) { plano = { id: uid(), item: "Lubrificação", veiculoId: edit.veiculoId, ativo: true, lubPontos: [ponto] }; plans.push(plano); }
    else plano.lubPontos = [...(plano.lubPontos || []), ponto];
    save({ plans }, "Adicionou ponto de lubrificação · " + edit.componente);
    setEdit(null);
  };
  const remove = (pt) => {
    if (!confirm("Remover ponto de lubrificação \"" + pt.componente + "\"?")) return;
    const plans = data.plans.map((p) => p.id === pt.planoId ? { ...p, lubPontos: (p.lubPontos || []).filter((_, i) => i !== pt.idx) } : p);
    save({ plans }, "Removeu ponto de lubrificação");
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-900 flex gap-2 flex-1"><Info size={15} className="shrink-0 mt-0.5" /><span>Pontos extraídos do manual pela IA ou cadastrados manualmente. Toque em um ponto para ver a imagem ilustrativa de onde aplicar o lubrificante.</span></div>
        {editable && <Btn onClick={startAdd} disabled={!data.vehicles.length}><Plus size={15} /> Ponto de lubrificação</Btn>}
      </div>
      {pontos.length === 0 ? <Empty icon={Wrench} title="Nenhum ponto de lubrificação" sub="Use a IA (Leitura do manual) para extrair os pontos automaticamente, ou cadastre manualmente." />
      : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pontos.map((pt, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {(pt.img || []).length > 0 ? <img src={pt.img[0]} alt="" onClick={() => setZoom(pt.img[0])} className="w-full h-32 object-cover cursor-zoom-in bg-slate-100" />
              : <div className="w-full h-32 bg-slate-50 grid place-items-center text-slate-300"><Wrench size={30} /></div>}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm text-slate-900">{pt.componente}</p>
                  {editable && <button onClick={() => remove(pt)} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>}
                </div>
                <p className="text-[11px] text-slate-500">{vmap[pt.veiculoId]?.prefixo || ""}</p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {pt.lubrificante && <p><b>Lubrificante:</b> {pt.lubrificante}</p>}
                  {pt.periodicidade && <p><b>Periodicidade:</b> {pt.periodicidade}</p>}
                  {pt.quantidade && <p><b>Quantidade:</b> {pt.quantidade}</p>}
                </div>
                {(pt.img || []).length > 0 && <button onClick={() => setZoom(pt.img[0])} className="text-xs font-bold text-blue-700 mt-2 hover:underline">Ver pontos de aplicação →</button>}
              </div>
            </div>
          ))}
        </div>}
      {edit && (
        <Modal title="Ponto de lubrificação" onClose={() => setEdit(null)} footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.componente || !edit.veiculoId}>Salvar</Btn></>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Veículo / equipamento" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value })}><option value="">Selecione…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></Field>
            <Field label="Componente" req><Inp value={edit.componente} onChange={(e) => setEdit({ ...edit, componente: e.target.value })} placeholder="Ex.: Lubrificação da lança" /></Field>
            <Field label="Tipo de lubrificante"><Inp value={edit.lubrificante} onChange={(e) => setEdit({ ...edit, lubrificante: e.target.value })} placeholder="Graxa EP2" /></Field>
            <Field label="Periodicidade"><Inp value={edit.periodicidade} onChange={(e) => setEdit({ ...edit, periodicidade: e.target.value })} placeholder="A cada 50 h" /></Field>
            <Field label="Quantidade"><Inp value={edit.quantidade} onChange={(e) => setEdit({ ...edit, quantidade: e.target.value })} placeholder="3 bicos" /></Field>
            <Field label="Imagem ilustrativa (pontos)" span={2}><PhotoInput label="Foto/ilustração dos pontos" max={3} photos={edit.img || []} onChange={(ps) => setEdit({ ...edit, img: ps })} /></Field>
          </div>
        </Modal>
      )}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ================= CHECKLIST DIÁRIO ================= */
function Checklist({ data, save, user }) {
  const [tab, setTab] = useState("novo");
  const editable = can(user, "checklist", "edit");
  const onlyOwn = user.perfil === "operacional" || user.perfil === "motorista";
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const meus = data.checklists.filter((c) => !onlyOwn || c.usuario === user.nome);
  return (
    <div>
      <PageHead title="Checklist Diário" sub="Inspeção rápida antes de usar o veículo/equipamento" actions={<HelpButton topic="checklist" />} />
      <Tabs cur={tab} set={setTab} tabs={[...(editable ? [["novo", "Novo checklist"]] : []), ["hist", (onlyOwn ? "Meus checklists" : "Checklists realizados") + " (" + meus.length + ")"]]} />
      {tab === "novo" && editable && <ChecklistNovo data={data} save={save} user={user} onDone={() => setTab("hist")} />}
      {tab === "hist" && <ChecklistHist rows={meus} vmap={vmap} />}
    </div>
  );
}
function ChecklistNovo({ data, save, user, onDone }) {
  const [veiculoId, setVeiculoId] = useState(""); const [km, setKm] = useState(""); const [hor, setHor] = useState("");
  const [itens, setItens] = useState({}); const [obs, setObs] = useState(""); const [fotos, setFotos] = useState([]);
  const [nivelComb, setNivelComb] = useState(50);
  const [danos, setDanos] = useState([]); const [danoView, setDanoView] = useState("frente"); const [danoModal, setDanoModal] = useState(null);
  const v = data.vehicles.find((x) => x.id === veiculoId);
  useEffect(() => { if (v) { setKm(String(v.kmAtual || "")); if (v.usaHorimetro) setHor(String(v.horimetro || "")); } }, [veiculoId]);
  const setItem = (it, val) => setItens((p) => ({ ...p, [it]: val }));
  const ncCount = Object.values(itens).filter((x) => x === "nc").length;
  const preenchidos = Object.keys(itens).length;

  const addDanoAt = (pos) => setDanoModal({ view: danoView, x: pos.x, y: pos.y, tipo: "", obs: "", foto: [] });
  const confirmDano = () => { setDanos((d) => [...d, { ...danoModal, n: d.length + 1 }]); setDanoModal(null); };

  const submit = () => {
    if (!veiculoId) return;
    const rec = {
      id: uid(), veiculoId, data: todayISO(), hora: nowTime(), usuario: user.nome, perfil: user.perfil,
      km: num(km), horimetro: v?.usaHorimetro ? num(hor) : null,
      itens, obs, fotos, danos, ncCount, nivelComb, ts: nowISO(),
      prefixo: v?.prefixo, placa: v?.placa,
    };
    let vehicles = data.vehicles;
    if (v && num(km) > num(v.kmAtual)) vehicles = data.vehicles.map((x) => x.id === v.id ? { ...x, kmAtual: num(km), horimetro: v.usaHorimetro && hor ? num(hor) : x.horimetro } : x);
    // registra danos no histórico do veículo (domínio damages)
    const newDamages = danos.map((d) => ({ id: uid(), veiculoId, data: todayISO(), origem: "checklist", checklistId: rec.id, usuario: user.nome, ...d }));
    save({ checklists: [...data.checklists, rec], damages: [...data.damages, ...newDamages], vehicles }, "Checklist · " + (v?.prefixo || "") + (ncCount ? " (" + ncCount + " não conforme)" : ""));
    onDone();
  };

  if (!data.vehicles.length) return <Empty icon={Truck} title="Nenhum veículo cadastrado" sub="Cadastre veículos para realizar checklists." />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid sm:grid-cols-2 gap-3">
        <Field label="Frota / veículo" req><Sel value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}><option value="">Selecione o veículo…</option>{data.vehicles.filter((x) => x.status !== "inativo").map((x) => <option key={x.id} value={x.id}>{x.prefixo} · {x.placa || "s/ placa"}</option>)}</Sel></Field>
        {v && (
          <div className="text-xs text-slate-500 flex items-end pb-2">
            <div><span className="font-semibold text-slate-700">{[v.marca, v.modelo].filter(Boolean).join(" ")}</span> · {v.combustivel || "—"} · registrado por <b>{user.nome}</b> em {fmtD(todayISO())} {nowTime()}</div>
          </div>
        )}
        {v && <Field label="KM atual" req><Inp type="number" value={km} onChange={(e) => setKm(e.target.value)} /></Field>}
        {v && v.usaHorimetro && <Field label="Horímetro (h)"><Inp type="number" step="0.1" value={hor} onChange={(e) => setHor(e.target.value)} /></Field>}
      </div>

      {v && <>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Itens de inspeção</h3>
            <div className="flex gap-2"><Badge tone="slate">{preenchidos}/{CHECK_ITENS.length}</Badge>{ncCount > 0 && <Badge tone="red">{ncCount} não conforme</Badge>}</div>
          </div>
          <div className="space-y-1.5">
            {CHECK_ITENS.map((it) => (
              <div key={it} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700 flex-1">{it}</span>
                <div className="flex gap-1 shrink-0">
                  {Object.entries(CHECK_EST).map(([k, [lbl, tone]]) => {
                    const sel = itens[it] === k;
                    const col = tone === "green" ? BRAND.green : tone === "red" ? BRAND.red : "#64748b";
                    return <button key={k} onClick={() => setItem(it, k)} className={"px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors " + (sel ? "text-white border-transparent" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")} style={sel ? { background: col } : {}}>{k === "conforme" ? "C" : k === "nc" ? "NC" : "N/A"}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">C = Conforme · NC = Não conforme · N/A = Não se aplica</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 text-sm mb-2">Marcação de danos no veículo</h3>
          <div className="flex gap-1 mb-3 flex-wrap">{Object.entries(VIEWS_VEIC).map(([k, lbl]) => <button key={k} onClick={() => setDanoView(k)} className={"px-2.5 py-1 rounded-lg text-xs font-bold " + (danoView === k ? "text-white" : "bg-slate-100 text-slate-600")} style={danoView === k ? { background: BRAND.navy } : {}}>{lbl}</button>)}</div>
          <VehicleDiagram view={danoView} marks={danos} onAdd={addDanoAt} />
          {danos.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {danos.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white grid place-items-center font-bold shrink-0">{d.n}</span>
                  <span className="flex-1"><b>{d.tipo || "Dano"}</b> · {VIEWS_VEIC[d.view]}{d.obs ? " — " + d.obs : ""}</span>
                  {(d.foto || []).length > 0 && <Camera size={13} className="text-blue-500" />}
                  <button onClick={() => setDanos(danos.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Nível de combustível</span>
            <FuelGauge value={nivelComb} onChange={setNivelComb} />
          </div>
          <Field label="Fotos gerais (arranhões, amassados, vazamentos, evidências…)"><PhotoInput label="Evidências" max={8} photos={fotos} onChange={setFotos} /></Field>
          <Field label="Outras observações"><TA value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Descreva qualquer problema não contemplado na lista…" /></Field>
        </div>

        <div className="flex justify-end gap-2">
          <Btn onClick={submit} disabled={!km}><CheckCircle2 size={16} /> Concluir checklist</Btn>
        </div>
      </>}

      {danoModal && (
        <Modal title="Detalhe do dano" sub={VIEWS_VEIC[danoModal.view]} onClose={() => setDanoModal(null)} footer={<><Btn v="sec" onClick={() => setDanoModal(null)}>Cancelar</Btn><Btn onClick={confirmDano} disabled={!danoModal.tipo}>Adicionar marcação</Btn></>}>
          <div className="space-y-3">
            <Field label="Tipo do dano" req><Sel value={danoModal.tipo} onChange={(e) => setDanoModal({ ...danoModal, tipo: e.target.value })}><option value="">Selecione…</option>{TIPOS_DANO.map((t) => <option key={t} value={t}>{t}</option>)}</Sel></Field>
            <Field label="Observação"><Inp value={danoModal.obs} onChange={(e) => setDanoModal({ ...danoModal, obs: e.target.value })} /></Field>
            <Field label="Foto do dano"><PhotoInput label="Evidência" max={3} photos={danoModal.foto} onChange={(ps) => setDanoModal({ ...danoModal, foto: ps })} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ChecklistHist({ rows, vmap }) {
  const [view, setView] = useState(null); const [zoom, setZoom] = useState(null);
  if (!rows.length) return <Empty icon={ClipboardList} title="Nenhum checklist realizado" sub="Os checklists preenchidos aparecerão aqui com data, hora, responsável e fotos." />;
  return (
    <>
      <DataTable onRow={setView}
        cols={[
          { label: "Data / hora", render: (c) => fmtD(c.data) + " " + (c.hora || "") },
          { label: "Veículo", render: (c) => <span className="font-semibold">{c.prefixo || vmap[c.veiculoId]?.prefixo || "—"}</span> },
          { label: "Responsável", render: (c) => c.usuario },
          { label: "KM", right: true, render: (c) => fmtN(c.km) },
          { label: "Situação", render: (c) => c.ncCount > 0 ? <Badge tone="red"><AlertTriangle size={11} /> {c.ncCount} não conforme</Badge> : <Badge tone="green"><CheckCircle2 size={11} /> Conforme</Badge> },
          { label: "Anexos", render: (c) => { const n = (c.fotos || []).length + (c.danos || []).length; return n ? <Badge tone="blue"><Camera size={11} /> {n}</Badge> : "—"; } },
        ]}
        rows={[...rows].sort((a, b) => String(b.ts).localeCompare(String(a.ts)))}
      />
      {view && <Modal title={"Checklist · " + (view.prefixo || "")} sub={fmtD(view.data) + " " + view.hora + " · " + view.usuario} onClose={() => setView(null)} w="max-w-3xl">
        <ChecklistDetail c={view} onZoom={setZoom} />
      </Modal>}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}
function ChecklistDetail({ c, onZoom }) {
  const nc = Object.entries(c.itens || {}).filter(([, v]) => v === "nc").map(([k]) => k);
  const na = Object.entries(c.itens || {}).filter(([, v]) => v === "na").map(([k]) => k);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <KPI icon={Gauge} tone="navy" label="KM" value={fmtN(c.km)} />
        <KPI icon={c.ncCount ? AlertTriangle : CheckCircle2} tone={c.ncCount ? "red" : "green"} label="Não conformes" value={c.ncCount || 0} />
        <KPI icon={Camera} tone="royal" label="Anexos" value={(c.fotos || []).length + (c.danos || []).length} />
      </div>
      {nc.length > 0 && <div><h4 className="text-xs font-bold text-red-600 uppercase mb-1.5">Itens não conformes</h4><div className="flex flex-wrap gap-1.5">{nc.map((i) => <Badge key={i} tone="red">{i}</Badge>)}</div></div>}
      {na.length > 0 && <div><h4 className="text-xs font-bold text-slate-500 uppercase mb-1.5">Não se aplica</h4><div className="flex flex-wrap gap-1.5">{na.map((i) => <Badge key={i} tone="slate">{i}</Badge>)}</div></div>}
      {c.obs && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700"><b>Observações:</b> {c.obs}</div>}
      {(c.danos || []).length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-600 uppercase mb-1.5">Danos marcados</h4>
          <div className="space-y-1.5">{c.danos.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white grid place-items-center font-bold">{d.n || i + 1}</span>
              <span className="flex-1"><b>{d.tipo}</b> · {VIEWS_VEIC[d.view]}{d.obs ? " — " + d.obs : ""}</span>
              {(d.foto || []).map((f, j) => <img key={j} src={f} onClick={() => onZoom(f)} className="w-9 h-9 rounded object-cover cursor-zoom-in" />)}
            </div>
          ))}</div>
        </div>
      )}
      {(c.fotos || []).length > 0 && <div><h4 className="text-xs font-bold text-slate-600 uppercase mb-1.5">Fotos</h4><PhotoStrip photos={c.fotos} onZoom={onZoom} /></div>}
    </div>
  );
}

/* ================= RESUMO DOS CHECKLISTS ================= */
function ResumoChecklists({ data, go }) {
  const [zoom, setZoom] = useState(null);
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  // último checklist por veículo
  const last = {};
  data.checklists.forEach((c) => { if (!last[c.veiculoId] || c.ts > last[c.veiculoId].ts) last[c.veiculoId] = c; });
  const veics = data.vehicles.filter((v) => v.status !== "inativo");
  const comCheck = Object.values(last);
  const conformes = comCheck.filter((c) => !c.ncCount).length;
  const pendencias = comCheck.filter((c) => c.ncCount > 0);
  const aguardando = data.vehicles.filter((v) => v.status === "manutencao").length;
  const semCheck = veics.filter((v) => !last[v.id]);

  return (
    <div className="space-y-5">
      <PageHead title="Resumo dos Checklists" sub="Visão imediata do estado da frota — sem abrir checklist por checklist" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={ClipboardList} tone="navy" label="Checklists realizados" value={data.checklists.length} sub={comCheck.length + " veículo(s) com registro"} />
        <KPI icon={CheckCircle2} tone="green" label="Veículos conformes" value={conformes} />
        <KPI icon={AlertTriangle} tone="red" label="Com pendências" value={pendencias.length} />
        <KPI icon={Wrench} tone="amber" label="Aguardando manutenção" value={aguardando} />
      </div>

      <div>
        <h3 className="font-bold text-slate-800 text-sm mb-2">Veículos com pendências (não conforme)</h3>
        {pendencias.length === 0 ? <Empty icon={CheckCircle2} title="Nenhuma pendência" sub="Todos os últimos checklists estão conformes." />
        : <div className="space-y-2">
            {[...pendencias].sort((a, b) => b.ncCount - a.ncCount).map((c) => {
              const nc = Object.entries(c.itens || {}).filter(([, v]) => v === "nc").map(([k]) => k);
              const prio = c.ncCount >= 4 ? "red" : c.ncCount >= 2 ? "amber" : "yellow";
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 relative overflow-hidden pl-4 pr-3 py-3">
                  <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: prio === "red" ? BRAND.red : prio === "amber" ? BRAND.amber : "#B48A0A" }} />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-slate-900">{c.prefixo || vmap[c.veiculoId]?.prefixo}</span><Badge tone={prio}>{c.ncCount} não conforme</Badge><span className="text-xs text-slate-400">{fmtD(c.data)} {c.hora}</span></div>
                    <span className="text-xs text-slate-400">por {c.usuario}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">{nc.slice(0, 8).map((i) => <Badge key={i} tone="red">{i}</Badge>)}</div>
                  {(c.fotos || []).length > 0 && <div className="mt-2"><PhotoStrip photos={c.fotos.slice(0, 6)} onZoom={setZoom} size={12} /></div>}
                </div>
              );
            })}
          </div>}
      </div>

      {semCheck.length > 0 && (
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-2">Sem checklist registrado ({semCheck.length})</h3>
          <div className="flex flex-wrap gap-2">{semCheck.map((v) => <Badge key={v.id} tone="slate">{v.prefixo}</Badge>)}</div>
        </div>
      )}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ================= HISTÓRICO FOTOGRÁFICO (TIMELINE) ================= */
function Timeline({ data }) {
  const [veiculoId, setVeiculoId] = useState(""); const [zoom, setZoom] = useState(null);
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const events = useMemo(() => {
    if (!veiculoId) return [];
    const ev = [];
    data.checklists.filter((c) => c.veiculoId === veiculoId).forEach((c) => {
      const fotos = [...(c.fotos || []), ...((c.danos || []).flatMap((d) => d.foto || []))];
      if (fotos.length || c.ncCount) ev.push({ ts: c.ts || c.data, tipo: "Checklist", icon: ClipboardList, tone: c.ncCount ? "red" : "green", desc: c.ncCount ? c.ncCount + " item(ns) não conforme" : "Conforme · " + fmtN(c.km) + " km", fotos });
    });
    data.fuel.filter((f) => f.veiculoId === veiculoId).forEach((f) => {
      const fotos = [...(f.fotoPainel || []), ...(f.fotoBomba || []), ...(f.fotoNota || [])];
      if (fotos.length) ev.push({ ts: (f.data || "") + "T" + (f.hora || "00:00"), tipo: "Abastecimento", icon: Fuel, tone: "blue", desc: fmtN(f.litros, 1) + " L · " + fmtBRL(f.valorTotal), fotos });
    });
    data.damages.filter((d) => d.veiculoId === veiculoId && (d.foto || []).length).forEach((d) => {
      ev.push({ ts: d.data, tipo: "Dano registrado", icon: AlertTriangle, tone: "amber", desc: (d.tipo || "Dano") + " · " + (VIEWS_VEIC[d.view] || ""), fotos: d.foto });
    });
    data.mrecords.filter((m) => m.veiculoId === veiculoId && (m.fotos || []).length).forEach((m) => {
      ev.push({ ts: m.data, tipo: "Manutenção", icon: Wrench, tone: "navy", desc: (m.servicos || "").slice(0, 60), fotos: m.fotos });
    });
    return ev.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  }, [veiculoId, data]);

  return (
    <div>
      <PageHead title="Histórico Fotográfico" sub="Linha do tempo com todas as evidências do veículo" />
      <div className="mb-4 max-w-sm"><Sel value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}><option value="">Selecione um veículo…</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo} · {v.placa}</option>)}</Sel></div>
      {!veiculoId ? <Empty icon={Camera} title="Selecione um veículo" sub="A linha do tempo reúne fotos de checklists, abastecimentos, danos e manutenções." />
      : events.length === 0 ? <Empty icon={Camera} title="Sem registros fotográficos" sub="Este veículo ainda não possui evidências com foto." />
      : <div className="relative pl-6">
          <span className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {events.map((e, i) => {
              const Icon = e.icon;
              return (
                <div key={i} className="relative">
                  <span className="absolute -left-[18px] top-1 w-4 h-4 rounded-full ring-4 ring-white" style={{ background: NIVEIS[e.tone] ? NIVEIS[e.tone].rail : (e.tone === "green" ? BRAND.green : e.tone === "blue" ? BRAND.royal : e.tone === "amber" ? BRAND.amber : e.tone === "red" ? BRAND.red : BRAND.navy) }} />
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-1"><Icon size={15} className="text-slate-500" /><span className="font-bold text-sm text-slate-900">{e.tipo}</span><Badge tone={e.tone === "green" ? "green" : e.tone === "red" ? "red" : e.tone === "amber" ? "amber" : "blue"}>{fmtDT(e.ts)}</Badge></div>
                    <p className="text-xs text-slate-500 mb-2">{e.desc}</p>
                    <PhotoStrip photos={e.fotos} onZoom={setZoom} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ================= MATRIZ DE PERMISSÕES ================= */
function PermMatrix({ data, save }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(data.settings.permOverrides || {})));
  const perfis = Object.keys(PERFIS).filter((p) => p !== "admin");
  const effective = (perfil, mod, action) => {
    const ov = draft[perfil] && draft[perfil][mod];
    if (ov && typeof ov[action] === "boolean") return ov[action];
    return (CAN[mod] && CAN[mod][action] || []).includes(perfil);
  };
  const toggle = (perfil, mod, action) => {
    const cur = effective(perfil, mod, action);
    setDraft((d) => { const n = JSON.parse(JSON.stringify(d)); n[perfil] = n[perfil] || {}; n[perfil][mod] = n[perfil][mod] || {}; n[perfil][mod][action] = !cur; return n; });
  };
  const apply = () => { save({ settings: { ...data.settings, permOverrides: draft } }, "Atualizou matriz de permissões"); setPermOverrides(draft); alert("Permissões atualizadas."); };
  const reset = () => { if (confirm("Restaurar permissões padrão de todos os perfis?")) { setDraft({}); } };
  const hasEdit = (mod) => !!(CAN[mod] && CAN[mod].edit);
  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-900 flex gap-2"><Info size={15} className="shrink-0 mt-0.5" /><span>Marque o que cada perfil pode <b>ver</b> e <b>editar</b>. O Administrador sempre tem acesso total. Clique em Aplicar para salvar.</span></div>
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="text-sm" style={{ minWidth: 720 }}>
          <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="px-3 py-2 text-left text-[11px] uppercase font-bold text-slate-500 sticky left-0 bg-slate-50">Módulo</th>{perfis.map((p) => <th key={p} className="px-3 py-2 text-center text-[11px] font-bold text-slate-600">{PERFIS[p]}</th>)}</tr></thead>
          <tbody>
            {PERM_MODULES.map(([mod, label]) => (
              <tr key={mod} className="border-b border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-white">{label}</td>
                {perfis.map((p) => (
                  <td key={p} className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer" title="Visualizar"><input type="checkbox" checked={effective(p, mod, "view")} onChange={() => toggle(p, mod, "view")} className="w-4 h-4" /><span className="text-[10px] text-slate-400">V</span></label>
                      {hasEdit(mod) && <label className="flex items-center gap-1 cursor-pointer" title="Editar"><input type="checkbox" checked={effective(p, mod, "edit")} onChange={() => toggle(p, mod, "edit")} className="w-4 h-4" /><span className="text-[10px] text-slate-400">E</span></label>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2"><Btn v="sec" onClick={reset}>Restaurar padrão</Btn><Btn onClick={apply}><CheckCircle2 size={15} /> Aplicar permissões</Btn></div>
      <p className="text-[11px] text-slate-400">V = Visualizar · E = Editar. Alterações passam a valer no próximo login de cada usuário.</p>
    </div>
  );
}


/* ================= MEDIDOR DE COMBUSTÍVEL (semicircular) ================= */
function FuelGauge({ value = 0, onChange, readOnly }) {
  // value 0..100
  const opts = NIVEL_MEDIDOR;
  const ang = (value / 100) * 180 - 90; // -90..90
  const cx = 110, cy = 100, r = 78;
  const rad = (a) => (a - 90) * Math.PI / 180;
  const needleX = cx + r * 0.82 * Math.cos(rad(value / 100 * 180));
  const needleY = cy + r * 0.82 * Math.sin(rad(value / 100 * 180));
  const arc = (a0, a1, color) => {
    const p0 = [cx + r * Math.cos(rad(a0)), cy + r * Math.sin(rad(a0))];
    const p1 = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
    return <path d={"M " + p0[0] + " " + p0[1] + " A " + r + " " + r + " 0 0 1 " + p1[0] + " " + p1[1]} fill="none" stroke={color} strokeWidth="14" strokeLinecap="butt" />;
  };
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 120" className="w-full max-w-[260px]">
        {arc(0, 45, BRAND.red)}{arc(45, 90, BRAND.amber)}{arc(90, 135, "#B48A0A")}{arc(135, 180, BRAND.green)}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={BRAND.navy} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill={BRAND.navy} />
        <text x={cx} y={cy + 16} textAnchor="middle" className="fill-slate-700" style={{ fontSize: 13, fontWeight: 800 }}>{(opts.find((o) => o[2] === value) || [,"—"])[1]}</text>
      </svg>
      {!readOnly && (
        <div className="flex gap-1 flex-wrap justify-center mt-1">
          {opts.map(([k, lbl, val]) => (
            <button key={k} onClick={() => onChange(val)} className={"px-3 py-1.5 rounded-lg text-xs font-bold border " + (value === val ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200")} style={value === val ? { background: BRAND.navy } : {}}>{lbl}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= CENTRAL DE AJUDA ================= */
const HELP = {
  checklist: { titulo: "Como fazer o checklist", passos: ["Selecione a frota do dia na lista.", "Confira os dados que aparecem automaticamente.", "Informe o KM ou horímetro atual.", "Marque cada item como Conforme, Não conforme ou Não se aplica.", "Posicione o marcador de combustível.", "Tire fotos de qualquer problema encontrado.", "Descreva pendências em Observações e conclua."] },
  abastecimento: { titulo: "Como abastecer corretamente", passos: INSTR_ABAST },
  calibragem: { titulo: "Como calibrar os pneus", passos: ["Verifique a pressão recomendada do fabricante (no manual ou etiqueta).", "Calibre com o pneu frio, sempre que possível.", "Aplique a mesma pressão em pneus do mesmo eixo.", "Registre a pressão de cada posição no sistema.", "Anexe foto do manômetro se solicitado."] },
  inspecao: { titulo: "Como medir o sulco do pneu", passos: ["Use um medidor de profundidade (sulcômetro).", "Meça em pelo menos 3 pontos ao longo da banda.", "Registre a menor medida encontrada em cada sulco.", "Sulco abaixo de 1,6 mm indica troca.", "Anote desgastes irregulares e fotografe."] },
  minhas: { titulo: "Minhas Pendências de Hoje", passos: ["Selecione sua frota do dia.", "O sistema mostra tudo que precisa ser feito, em ordem de prioridade.", "Execute cada tarefa tocando no cartão.", "Você não precisa procurar menus — só seguir a lista."] },
};
function HelpButton({ topic }) {
  const [open, setOpen] = useState(false);
  const h = HELP[topic]; if (!h) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"><Info size={13} /> Como fazer?</button>
      {open && (
        <Modal title={h.titulo} sub="Central de Ajuda" onClose={() => setOpen(false)} footer={<Btn onClick={() => setOpen(false)}>Entendi</Btn>}>
          <ol className="space-y-2">{h.passos.map((p, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-xs font-bold shrink-0">{i + 1}</span>{p}</li>)}</ol>
        </Modal>
      )}
    </>
  );
}
function CentralAjuda() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <PageHead title="Central de Ajuda" sub="Biblioteca de procedimentos em linguagem simples" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(HELP).map(([k, h]) => (
          <button key={k} onClick={() => setOpen(k)} className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all">
            <Info size={20} style={{ color: BRAND.royal }} className="mb-2" />
            <p className="font-bold text-sm text-slate-900">{h.titulo}</p>
            <p className="text-xs text-slate-500 mt-1">{h.passos.length} passos</p>
          </button>
        ))}
      </div>
      {open && (() => { const h = HELP[open]; return (
        <Modal title={h.titulo} sub="Central de Ajuda" onClose={() => setOpen(null)} footer={<Btn onClick={() => setOpen(null)}>Fechar</Btn>}>
          <ol className="space-y-2">{h.passos.map((p, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-xs font-bold shrink-0">{i + 1}</span>{p}</li>)}</ol>
        </Modal>
      ); })()}
    </div>
  );
}

/* ================= COMBUSTÍVEIS (Admin) ================= */
function CadCombustiveis({ data, save }) {
  const [edit, setEdit] = useState(null);
  const seed = () => save({ fuels: SEED_FUELS.map((x) => ({ ...x })) }, "Carregou combustíveis padrão");
  const submit = () => { if (!edit.nome) return; const list = edit.id ? data.fuels.map((f) => f.id === edit.id ? edit : f) : [...data.fuels, { ...edit, id: uid() }]; save({ fuels: list }, (edit.id ? "Editou" : "Cadastrou") + " combustível " + edit.nome); setEdit(null); };
  const del = (f) => { if (!confirm("Remover " + f.nome + "?")) return; save({ fuels: data.fuels.filter((x) => x.id !== f.id) }, "Removeu combustível " + f.nome); };
  return (
    <div>
      <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800">Combustíveis</h3><div className="flex gap-2">{data.fuels.length === 0 && <Btn v="sec" sm onClick={seed}>Carregar padrão</Btn>}<Btn sm onClick={() => setEdit({ nome: "", ativo: true })}><Plus size={14} /> Novo</Btn></div></div>
      {data.fuels.length === 0 ? <Empty icon={Fuel} title="Nenhum combustível" sub="Carregue a lista padrão ou cadastre manualmente." />
      : <DataTable onRow={setEdit} cols={[{ label: "Combustível", render: (f) => <span className="font-semibold">{f.nome}</span> }, { label: "Situação", render: (f) => f.ativo === false ? <Badge tone="slate">Inativo</Badge> : <Badge tone="green">Ativo</Badge> }, { label: "", right: true, render: (f) => <button onClick={(e) => { e.stopPropagation(); del(f); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button> }]} rows={data.fuels} />}
      {edit && <Modal title={edit.id ? "Editar combustível" : "Novo combustível"} onClose={() => setEdit(null)} footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome}>Salvar</Btn></>}>
        <div className="space-y-3"><Field label="Nome" req><Inp value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field><Field label="Ativo" type="check"><label className="flex items-center gap-2 py-2"><input type="checkbox" checked={edit.ativo !== false} onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Disponível para seleção</span></label></Field></div>
      </Modal>}
    </div>
  );
}

/* ================= DIAGRAMAS DE RODAGEM (Admin) ================= */
function CadDiagramas({ data, save }) {
  const [edit, setEdit] = useState(null);
  const seed = () => save({ diagrams: SEED_DIAGRAMS.map((x) => ({ ...x })) }, "Carregou diagramas padrão");
  const submit = () => {
    if (!edit.nome) return;
    const posicoes = edit.semPneus ? [] : String(edit.posicoesTexto || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    const rec = { id: edit.id || uid(), nome: edit.nome, semPneus: !!edit.semPneus, posicoes };
    const list = edit.id ? data.diagrams.map((d) => d.id === edit.id ? rec : d) : [...data.diagrams, rec];
    save({ diagrams: list }, (edit.id ? "Editou" : "Criou") + " diagrama " + edit.nome); setEdit(null);
  };
  const del = (d) => { if (!confirm("Remover diagrama " + d.nome + "?")) return; save({ diagrams: data.diagrams.filter((x) => x.id !== d.id) }, "Removeu diagrama " + d.nome); };
  const start = (d) => setEdit(d ? { ...d, posicoesTexto: (d.posicoes || []).join(", ") } : { nome: "", semPneus: false, posicoesTexto: "" });
  return (
    <div>
      <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-slate-800">Diagramas de rodagem</h3><div className="flex gap-2">{data.diagrams.length === 0 && <Btn v="sec" sm onClick={seed}>Carregar padrão</Btn>}<Btn sm onClick={() => start(null)}><Plus size={14} /> Novo</Btn></div></div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900 mb-3 flex gap-2"><Info size={14} className="shrink-0 mt-0.5" /><span>Padrão de posições por eixo: <b>1E, 1D</b> (1º eixo), <b>2E, 2D</b> (2º eixo) e duplos <b>2EE, 2EI, 2DI, 2DE</b>. Nunca use OE/OD/TE/TD. Crie quantos diagramas precisar, sem alterar código.</span></div>
      {data.diagrams.length === 0 ? <Empty icon={CircleDot} title="Nenhum diagrama" sub="Carregue os diagramas padrão ou crie os seus." />
      : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.diagrams.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between"><p className="font-bold text-sm text-slate-900">{d.nome}</p><div className="flex gap-1"><button onClick={() => start(d)} className="text-slate-400 hover:text-blue-600"><Pencil size={13} /></button><button onClick={() => del(d)} className="text-slate-400 hover:text-red-500"><Trash2 size={13} /></button></div></div>
              {d.semPneus ? <Badge tone="slate">Sem pneus (esteira)</Badge>
              : <div className="flex flex-wrap gap-1 mt-2">{d.posicoes.map((p) => <span key={p} className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-bold text-slate-600">{p}</span>)}</div>}
            </div>
          ))}
        </div>}
      {edit && <Modal title={edit.id ? "Editar diagrama" : "Novo diagrama"} onClose={() => setEdit(null)} footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome}>Salvar</Btn></>}>
        <div className="space-y-3">
          <Field label="Nome do diagrama" req><Inp value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: Truck 3 eixos" /></Field>
          <Field label="Sem pneus?" type="check"><label className="flex items-center gap-2 py-2"><input type="checkbox" checked={!!edit.semPneus} onChange={(e) => setEdit({ ...edit, semPneus: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Equipamento de esteira (não controla pneus)</span></label></Field>
          {!edit.semPneus && <Field label="Posições (separadas por vírgula)" req><TA value={edit.posicoesTexto} onChange={(e) => setEdit({ ...edit, posicoesTexto: e.target.value })} placeholder="1E, 1D, 2EE, 2EI, 2DI, 2DE" /></Field>}
        </div>
      </Modal>}
    </div>
  );
}

/* ================= TIPOS DE EQUIPAMENTO (Admin) ================= */
function CadTiposEquip({ data, save }) {
  const [edit, setEdit] = useState(null);
  const seed = () => save({ equipTypes: SEED_EQUIPTYPES.map((x) => ({ ...x })) }, "Carregou tipos de equipamento padrão");
  const submit = () => { if (!edit.nome) return; const list = edit.id ? data.equipTypes.map((t) => t.id === edit.id ? edit : t) : [...data.equipTypes, { ...edit, id: uid() }]; save({ equipTypes: list }, (edit.id ? "Editou" : "Criou") + " tipo " + edit.nome); setEdit(null); };
  const del = (t) => { if (!confirm("Remover tipo " + t.nome + "?")) return; save({ equipTypes: data.equipTypes.filter((x) => x.id !== t.id) }, "Removeu tipo " + t.nome); };
  const dg = (id) => (data.diagrams || []).find((x) => x.id === id);
  return (
    <div>
      <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-slate-800">Tipos de equipamento</h3><div className="flex gap-2">{data.equipTypes.length === 0 && <Btn v="sec" sm onClick={seed}>Carregar padrão</Btn>}<Btn sm onClick={() => setEdit({ nome: "", categoria: "emplacado", diagramaId: "", usaHorimetro: false })}><Plus size={14} /> Novo</Btn></div></div>
      {data.equipTypes.length === 0 ? <Empty icon={Truck} title="Nenhum tipo" sub="Carregue os tipos padrão (emplacados e linha amarela) ou crie os seus." />
      : <DataTable onRow={setEdit} cols={[
          { label: "Tipo", render: (t) => <span className="font-semibold">{t.nome}</span> },
          { label: "Categoria", render: (t) => <Badge tone={t.categoria === "amarela" ? "amber" : "blue"}>{t.categoria === "amarela" ? "Linha amarela" : "Emplacado"}</Badge> },
          { label: "Placa", render: (t) => t.categoria === "amarela" ? "Não obrigatória" : "Obrigatória" },
          { label: "Medição", render: (t) => t.usaHorimetro ? "Horímetro" : "KM" },
          { label: "Diagrama", render: (t) => dg(t.diagramaId)?.nome || "—" },
          { label: "", right: true, render: (t) => <button onClick={(e) => { e.stopPropagation(); del(t); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button> },
        ]} rows={data.equipTypes} />}
      {edit && <Modal title={edit.id ? "Editar tipo" : "Novo tipo de equipamento"} onClose={() => setEdit(null)} footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome}>Salvar</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome" req span={2}><Inp value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: Retroescavadeira" /></Field>
          <Field label="Categoria"><Sel value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value })}><option value="emplacado">Emplacado (placa obrigatória)</option><option value="amarela">Linha amarela (sem placa)</option></Sel></Field>
          <Field label="Diagrama de rodagem"><Sel value={edit.diagramaId} onChange={(e) => setEdit({ ...edit, diagramaId: e.target.value })}><option value="">Selecione…</option>{(data.diagrams || []).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</Sel></Field>
          <Field label="Controlar por horímetro?" type="check"><label className="flex items-center gap-2 py-2"><input type="checkbox" checked={!!edit.usaHorimetro} onChange={(e) => setEdit({ ...edit, usaHorimetro: e.target.checked })} className="w-4 h-4" /><span className="text-sm">Sim (máquinas)</span></label></Field>
        </div>
      </Modal>}
    </div>
  );
}

/* ================= DOCUMENTAÇÃO + OCR ================= */
function Documentacao({ data, save, user }) {
  const [veiculoId, setVeiculoId] = useState(""); const [add, setAdd] = useState(null); const [zoom, setZoom] = useState(null);
  const editable = can(user, "veiculos", "edit");
  const v = data.vehicles.find((x) => x.id === veiculoId);
  const docs = v ? (v.docs || []) : [];

  const saveDoc = (rec, oldDoc) => {
    const novo = { id: uid(), ...rec, criadoEm: nowISO(), usuario: user.nome, versoes: oldDoc ? [...(oldDoc.versoes || []), { data: oldDoc.criadoEm, usuario: oldDoc.usuario, arquivo: oldDoc.arquivo, nome: oldDoc.nomeArquivo }] : [] };
    let list;
    if (oldDoc) list = docs.map((d) => d.id === oldDoc.id ? { ...novo, id: oldDoc.id, versoes: novo.versoes } : d);
    else list = [...docs, novo];
    save({ vehicles: data.vehicles.map((x) => x.id === veiculoId ? { ...x, docs: list } : x) }, (oldDoc ? "Atualizou" : "Anexou") + " documento " + rec.tipo + " · " + v.prefixo);
    setAdd(null);
  };

  return (
    <div>
      <PageHead title="Documentação" sub="CRLV, notas, manuais — com histórico e leitura automática (OCR)" />
      <div className="mb-4 flex gap-2 flex-wrap items-end">
        <div className="max-w-sm flex-1"><Field label="Frota"><Sel value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}><option value="">Selecione…</option>{data.vehicles.map((x) => <option key={x.id} value={x.id}>{x.prefixo} · {x.placa || "s/ placa"}</option>)}</Sel></Field></div>
        {v && editable && <Btn onClick={() => setAdd({ tipo: "CRLV", validade: "" })}><Plus size={16} /> Anexar documento</Btn>}
      </div>
      {!v ? <Empty icon={FileText} title="Selecione uma frota" sub="Escolha o veículo para ver e anexar documentos." />
      : docs.length === 0 ? <Empty icon={FileText} title="Nenhum documento anexado" sub="Anexe CRLV, documento da máquina, nota fiscal, manual e outros (PDF, JPG, PNG).">{editable && <Btn onClick={() => setAdd({ tipo: "CRLV", validade: "" })}><Plus size={16} /> Anexar primeiro documento</Btn>}</Empty>
      : <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 flex-wrap">
              <FileText size={22} style={{ color: BRAND.royal }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900">{d.tipo} {d.validade && <Badge tone={daysUntil(d.validade) < 0 ? "red" : daysUntil(d.validade) <= 30 ? "amber" : "green"}>venc. {fmtD(d.validade)}</Badge>}</p>
                <p className="text-[11px] text-slate-500">Anexado por {d.usuario} em {fmtDT(d.criadoEm)}{(d.versoes || []).length ? " · " + d.versoes.length + " versão(ões) anterior(es)" : ""}</p>
              </div>
              {d.arquivo && (d.arquivo.startsWith("data:image") ? <img src={d.arquivo} onClick={() => setZoom(d.arquivo)} className="w-12 h-12 rounded object-cover cursor-zoom-in" /> : <a href={d.arquivo} download={d.nomeArquivo || "documento"} className="text-xs font-bold text-blue-700 hover:underline">Baixar</a>)}
              {editable && <Btn sm v="sec" onClick={() => setAdd({ tipo: d.tipo, validade: d.validade || "", replaceId: d.id })}>Atualizar</Btn>}
            </div>
          ))}
        </div>}
      {add && <DocModal add={add} setAdd={setAdd} onSave={saveDoc} docs={docs} />}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
function DocModal({ add, setAdd, onSave, docs }) {
  const [tipo, setTipo] = useState(add.tipo); const [validade, setValidade] = useState(add.validade || "");
  const [arquivo, setArquivo] = useState(null); const [nomeArquivo, setNome] = useState("");
  const [ocr, setOcr] = useState(null); const [ocrLoad, setOcrLoad] = useState(false); const [ocrErr, setOcrErr] = useState("");
  const ref = useRef();
  const pick = async (file) => {
    setNome(file.name);
    if (file.type.startsWith("image")) setArquivo(await compressImage(file, 1200, 0.7));
    else setArquivo(await fileToDataURL(file));
  };
  const runOCR = async () => {
    if (!arquivo || !arquivo.startsWith("data:image")) { setOcrErr("Anexe uma imagem (JPG/PNG) do CRLV para leitura."); return; }
    setOcrLoad(true); setOcrErr("");
    try {
      const b64 = arquivo.split(",")[1];
      const media = arquivo.substring(5, arquivo.indexOf(";"));
      const content = [{ type: "image", source: { type: "base64", media_type: media, data: b64 } }, { type: "text", text: "Leia este documento de veículo (CRLV brasileiro) e extraia os dados. Responda APENAS com JSON válido: {\"placa\":\"\",\"marca\":\"\",\"modelo\":\"\",\"ano\":\"\",\"chassi\":\"\",\"renavam\":\"\"}. Use string vazia se não encontrar. Sem texto fora do JSON." }];
      const r = await askAI(content, true); setOcr(r);
    } catch (e) { setOcrErr(e.message || "Não foi possível ler o documento."); } finally { setOcrLoad(false); }
  };
  return (
    <Modal title={add.replaceId ? "Atualizar documento" : "Anexar documento"} sub="PDF, JPG ou PNG · o documento antigo é preservado no histórico" onClose={() => setAdd(null)}
      footer={<><Btn v="sec" onClick={() => setAdd(null)}>Cancelar</Btn><Btn onClick={() => onSave({ tipo, validade, arquivo, nomeArquivo, ocr }, add.replaceId ? docs.find((d) => d.id === add.replaceId) : null)} disabled={!arquivo}>Salvar</Btn></>}>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tipo de documento"><Sel value={tipo} onChange={(e) => setTipo(e.target.value)}>{DOC_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Sel></Field>
          <Field label="Validade (se houver)"><Inp type="date" value={validade} onChange={(e) => setValidade(e.target.value)} /></Field>
        </div>
        <div>
          <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => e.target.files[0] && pick(e.target.files[0])} />
          <Btn v="sec" onClick={() => ref.current?.click()}><FileUp size={16} /> {arquivo ? "Trocar arquivo" : "Selecionar arquivo"}</Btn>
          {nomeArquivo && <span className="ml-2 text-xs text-slate-500">{nomeArquivo}</span>}
        </div>
        {arquivo && arquivo.startsWith("data:image") && <img src={arquivo} className="max-h-40 rounded-lg border" />}
        {tipo === "CRLV" && arquivo && arquivo.startsWith("data:image") && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Sparkles size={13} /> Leitura automática (OCR)</span><Btn sm onClick={runOCR} disabled={ocrLoad}>{ocrLoad ? <Spin label="Lendo…" /> : "Ler CRLV"}</Btn></div>
            {ocrErr && <p className="text-xs text-red-600 mt-2">{ocrErr}</p>}
            {ocr && <div className="mt-2 grid grid-cols-2 gap-2 text-xs">{Object.entries(ocr).map(([k, val]) => <div key={k} className="bg-white rounded p-1.5"><span className="text-slate-400 uppercase text-[9px]">{k}</span><input className="w-full font-semibold text-slate-800 bg-transparent outline-none" value={val} onChange={(e) => setOcr({ ...ocr, [k]: e.target.value })} /></div>)}<p className="col-span-2 text-[10px] text-slate-400">Confira e corrija antes de salvar. Os dados ficam registrados junto ao documento.</p></div>}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ================= CALIBRAGEM ================= */
function Calibragem({ data, save, user }) {
  const [edit, setEdit] = useState(null); const [fV, setFV] = useState(""); const [zoom, setZoom] = useState(null);
  const editable = can(user, "pneus", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const cfg = { ...DEF_ALERTCFG, ...(data.settings.alertCfg || {}) };
  const start = () => setEdit({ veiculoId: fV || "", data: todayISO(), responsavel: user.nome, pressoes: {}, obs: "", fotos: [] });
  const submit = () => {
    if (!edit.veiculoId) return;
    const list = edit.id ? data.calibrations.map((c) => c.id === edit.id ? edit : c) : [...data.calibrations, { ...edit, id: uid(), ts: nowISO() }];
    // Grava a pressão atual nos pneus aplicados (veículo+posição) — padrão Prolog
    let tires = data.tires;
    Object.entries(edit.pressoes || {}).forEach(([pos, psi]) => {
      if (num(psi) > 0) { const t = tires.find((x) => x.status === "em_uso" && x.veiculoId === edit.veiculoId && x.posicao === pos); if (t) tires = tires.map((x) => x.id === t.id ? { ...x, pressaoAtual: num(psi), ultimaCalibragem: edit.data } : x); }
    });
    save({ calibrations: list, tires }, "Calibragem · " + (vmap[edit.veiculoId]?.prefixo || ""));
    setEdit(null);
  };
  const del = (c) => { if (!confirm("Remover esta calibragem?")) return; save({ calibrations: data.calibrations.filter((x) => x.id !== c.id) }, "Removeu calibragem"); setEdit(null); };
  const rows = [...data.calibrations].filter((c) => !fV || c.veiculoId === fV).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const lastByV = {}; data.calibrations.forEach((c) => { if (!lastByV[c.veiculoId] || c.data > lastByV[c.veiculoId].data) lastByV[c.veiculoId] = c; });

  return (
    <div>
      <PageHead title="Controle de Calibragem" sub="Pressão por posição · intervalo configurável" actions={<div className="flex gap-2 items-center"><HelpButton topic="calibragem" />{editable && <Btn onClick={start} disabled={!data.vehicles.length}><Plus size={16} /> Nova calibragem</Btn>}</div>} />
      <div className="mb-3"><Sel value={fV} onChange={(e) => setFV(e.target.value)}><option value="">Todas as frotas</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Sel></div>
      {data.calibrations.length === 0 ? <Empty icon={Gauge} title="Nenhuma calibragem registrada" sub="Registre a pressão de cada pneu e configure o intervalo de aviso.">{editable && data.vehicles.length > 0 && <Btn onClick={start}><Plus size={16} /> Registrar calibragem</Btn>}</Empty>
      : <DataTable onRow={editable ? setEdit : undefined} cols={[
          { label: "Data", render: (c) => fmtD(c.data) },
          { label: "Frota", render: (c) => <span className="font-semibold">{vmap[c.veiculoId]?.prefixo || "—"}</span> },
          { label: "Responsável", render: (c) => c.responsavel || "—" },
          { label: "Posições", render: (c) => Object.keys(c.pressoes || {}).filter((k) => c.pressoes[k]).length + " pneu(s)" },
          { label: "Próxima", render: (c) => { if (lastByV[c.veiculoId]?.id !== c.id) return "—"; const iv = num(vmap[c.veiculoId]?.calibIntervalDias) || cfg.calibIntervalDias; const rest = iv - Math.floor((new Date() - new Date(c.data + "T12:00:00")) / 86400000); return rest < 0 ? <Badge tone="red">vencida</Badge> : rest <= 3 ? <Badge tone="amber">{rest}d</Badge> : <Badge tone="green">{rest}d</Badge>; } },
          { label: "Fotos", render: (c) => (c.fotos || []).length ? <Badge tone="blue"><Camera size={11} /> {c.fotos.length}</Badge> : "—" },
        ]} rows={rows} />}
      {edit && <CalibModal edit={edit} setEdit={setEdit} submit={submit} del={del} data={data} vmap={vmap} />}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}
function CalibModal({ edit, setEdit, submit, del, data, vmap }) {
  const v = vmap[edit.veiculoId];
  const posicoes = v ? posicoesDe(v, data) : [];
  const setP = (pos, val) => setEdit({ ...edit, pressoes: { ...edit.pressoes, [pos]: val } });
  return (
    <Modal title={edit.id ? "Editar calibragem" : "Nova calibragem"} onClose={() => setEdit(null)} w="max-w-2xl"
      footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.veiculoId}>Salvar</Btn></div></div>}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label="Frota" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value, pressoes: {} })}><option value="">Selecione…</option>{data.vehicles.map((x) => <option key={x.id} value={x.id}>{x.prefixo} · {x.placa}</option>)}</Sel></Field>
        <Field label="Data"><Inp type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></Field>
        <Field label="Responsável"><Inp value={edit.responsavel || ""} onChange={(e) => setEdit({ ...edit, responsavel: e.target.value })} /></Field>
      </div>
      {v && (posicoes.length === 0 ? <p className="text-xs text-slate-400 mb-3">Este equipamento não controla pneus (sem diagrama de rodagem).</p>
      : <div className="mb-3"><span className="block text-xs font-semibold text-slate-600 mb-2">Pressão por posição (PSI)</span>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{posicoes.map((p) => <div key={p} className="bg-slate-50 rounded-lg p-2 text-center"><span className="block text-[11px] font-bold text-slate-500">{p}</span><input type="number" className="w-full text-center font-bold text-slate-800 bg-transparent outline-none" placeholder="—" value={edit.pressoes[p] || ""} onChange={(e) => setP(p, e.target.value)} /></div>)}</div>
        </div>)}
      <div className="space-y-3"><Field label="Observações"><TA value={edit.obs || ""} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} /></Field><Field label="Evidência fotográfica (opcional)"><PhotoInput label="Foto" max={4} photos={edit.fotos || []} onChange={(ps) => setEdit({ ...edit, fotos: ps })} /></Field></div>
    </Modal>
  );
}

/* ================= INSPEÇÃO DE PNEUS ================= */
function Inspecao({ data, save, user }) {
  const [edit, setEdit] = useState(null); const [fV, setFV] = useState("");
  const editable = can(user, "pneus", "edit");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const cfg = { ...DEF_ALERTCFG, ...(data.settings.alertCfg || {}) };
  const start = () => setEdit({ veiculoId: fV || "", data: todayISO(), responsavel: user.nome, medicoes: [], obs: "", fotos: [] });
  const submit = () => {
    if (!edit.veiculoId) return;
    const list = edit.id ? data.inspections.map((c) => c.id === edit.id ? edit : c) : [...data.inspections, { ...edit, id: uid(), ts: nowISO() }];
    // Alimenta os sulcos medidos de volta nos pneus aplicados (veículo+posição) — padrão Prolog
    const keys = ["interno", "centroInt", "centroExt", "externo"];
    let tires = data.tires;
    (edit.medicoes || []).forEach((m) => {
      const t = tires.find((x) => x.status === "em_uso" && x.veiculoId === edit.veiculoId && x.posicao === m.pos);
      if (t && (m.sulcos || []).some((s) => num(s) > 0)) {
        const patch = { sulco_interno: m.sulcos[0] || "", sulco_centroInt: m.sulcos[1] || "", sulco_centroExt: m.sulcos[2] || "", sulco_externo: m.sulcos[3] || "", ultimaInspecao: edit.data };
        tires = tires.map((x) => x.id === t.id ? { ...x, ...patch } : x);
      }
    });
    save({ inspections: list, tires }, "Inspeção de pneus · " + (vmap[edit.veiculoId]?.prefixo || ""));
    setEdit(null);
  };
  const del = (c) => { if (!confirm("Remover esta inspeção?")) return; save({ inspections: data.inspections.filter((x) => x.id !== c.id) }, "Removeu inspeção"); setEdit(null); };
  const rows = [...data.inspections].filter((c) => !fV || c.veiculoId === fV).sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const minSulco = (ins) => Math.min(...(ins.medicoes || []).flatMap((m) => (m.sulcos || []).map(num)).filter((x) => x > 0), 99);

  return (
    <div>
      <PageHead title="Inspeção dos Pneus" sub="Profundidade de sulco por posição · acompanha o desgaste" actions={<div className="flex gap-2 items-center"><HelpButton topic="inspecao" />{editable && <Btn onClick={start} disabled={!data.vehicles.length}><Plus size={16} /> Nova inspeção</Btn>}</div>} />
      <div className="mb-3"><Sel value={fV} onChange={(e) => setFV(e.target.value)}><option value="">Todas as frotas</option>{data.vehicles.map((v) => <option key={v.id} value={v.id}>{v.prefixo}</option>)}</Sel></div>
      {data.inspections.length === 0 ? <Empty icon={CircleDot} title="Nenhuma inspeção registrada" sub="Meça a profundidade de cada sulco para acompanhar o desgaste ao longo do tempo.">{editable && data.vehicles.length > 0 && <Btn onClick={start}><Plus size={16} /> Registrar inspeção</Btn>}</Empty>
      : <DataTable onRow={editable ? setEdit : undefined} cols={[
          { label: "Data", render: (c) => fmtD(c.data) },
          { label: "Frota", render: (c) => <span className="font-semibold">{vmap[c.veiculoId]?.prefixo || "—"}</span> },
          { label: "Responsável", render: (c) => c.responsavel || "—" },
          { label: "Posições medidas", render: (c) => (c.medicoes || []).length },
          { label: "Menor sulco", right: true, render: (c) => { const m = minSulco(c); return m < 99 ? <Badge tone={m < cfg.sulcoMinimo ? "red" : m < cfg.sulcoMinimo * 1.6 ? "amber" : "green"}>{fmtN(m, 1)} mm</Badge> : "—"; } },
        ]} rows={rows} />}
      {edit && <InspModal edit={edit} setEdit={setEdit} submit={submit} del={del} data={data} vmap={vmap} cfg={cfg} />}
    </div>
  );
}
function InspModal({ edit, setEdit, submit, del, data, vmap, cfg }) {
  const v = vmap[edit.veiculoId];
  const posicoes = v ? posicoesDe(v, data) : [];
  const nSulcos = cfg.numSulcos || 4;
  const medOf = (pos) => edit.medicoes.find((m) => m.pos === pos) || { pos, sulcos: Array(nSulcos).fill("") };
  const setSulco = (pos, idx, val) => {
    const med = medOf(pos); const sulcos = [...(med.sulcos || Array(nSulcos).fill(""))]; sulcos[idx] = val;
    const others = edit.medicoes.filter((m) => m.pos !== pos);
    setEdit({ ...edit, medicoes: [...others, { pos, sulcos }] });
  };
  return (
    <Modal title={edit.id ? "Editar inspeção" : "Nova inspeção de pneus"} sub={"Profundidade em mm · " + nSulcos + " sulcos por pneu"} onClose={() => setEdit(null)} w="max-w-3xl"
      footer={<div className="flex justify-between w-full"><div>{edit.id && <Btn v="dan" sm onClick={() => del(edit)}><Trash2 size={13} /> Remover</Btn>}</div><div className="flex gap-2"><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.veiculoId}>Salvar</Btn></div></div>}>
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <Field label="Frota" req><Sel value={edit.veiculoId} onChange={(e) => setEdit({ ...edit, veiculoId: e.target.value, medicoes: [] })}><option value="">Selecione…</option>{data.vehicles.map((x) => <option key={x.id} value={x.id}>{x.prefixo}</option>)}</Sel></Field>
        <Field label="Data"><Inp type="date" value={edit.data} onChange={(e) => setEdit({ ...edit, data: e.target.value })} /></Field>
        <Field label="Responsável"><Inp value={edit.responsavel || ""} onChange={(e) => setEdit({ ...edit, responsavel: e.target.value })} /></Field>
      </div>
      {v && (posicoes.length === 0 ? <p className="text-xs text-slate-400 mb-3">Equipamento sem pneus.</p>
      : <div className="mb-3 overflow-x-auto">
          <table className="text-sm" style={{ minWidth: 460 }}>
            <thead><tr className="text-[11px] text-slate-500 uppercase"><th className="text-left py-1 pr-3">Posição</th>{Array(nSulcos).fill(0).map((_, i) => <th key={i} className="px-1.5 py-1">{nSulcos === 4 ? ["Interno", "Centro int.", "Centro ext.", "Externo"][i] : "Sulco " + (i + 1)}</th>)}</tr></thead>
            <tbody>{posicoes.map((p) => { const med = medOf(p); return <tr key={p} className="border-t border-slate-100"><td className="py-1.5 pr-3 font-bold text-slate-700">{p}</td>{Array(nSulcos).fill(0).map((_, i) => <td key={i} className="px-1"><input type="number" step="0.1" className="w-16 text-center rounded border border-slate-200 py-1 text-sm" placeholder="mm" value={(med.sulcos || [])[i] || ""} onChange={(e) => setSulco(p, i, e.target.value)} /></td>)}</tr>; })}</tbody>
          </table>
        </div>)}
      <div className="space-y-3"><Field label="Observações"><TA value={edit.obs || ""} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} /></Field><Field label="Fotos"><PhotoInput label="Evidências" max={6} photos={edit.fotos || []} onChange={(ps) => setEdit({ ...edit, fotos: ps })} /></Field></div>
    </Modal>
  );
}

/* ================= MINHAS PENDÊNCIAS DE HOJE ================= */
function MinhasPendencias({ data, alerts, go, user }) {
  const [veiculoId, setVeiculoId] = useState("");
  const vmap = Object.fromEntries(data.vehicles.map((v) => [v.id, v]));
  const v = vmap[veiculoId];
  const meusVeics = data.vehicles.filter((x) => x.status !== "inativo");
  const tarefas = useMemo(() => {
    if (!veiculoId) return [];
    const t = [];
    const feitoHoje = data.checklists.some((c) => c.veiculoId === veiculoId && c.data === todayISO());
    t.push({ prio: feitoHoje ? 3 : 0, done: feitoHoje, icon: ClipboardList, tone: feitoHoje ? "green" : "red", titulo: "Checklist Diário", detalhe: feitoHoje ? "Concluído hoje" : "Obrigatório — pendente", acao: () => go("checklist") });
    alerts.filter((a) => a.veiculoId === veiculoId).forEach((a) => {
      const map = { calibragem: [1, Gauge, "amber", () => go("calibragem")], inspecao: [1, CircleDot, "amber", () => go("inspecao")], preventiva: [1, Wrench, "amber", () => go("manut")], doc: [2, FileText, "blue", () => go("documentacao")], pneu: [1, CircleDot, "amber", () => go("pneus")], consumo: [2, Fuel, "blue", () => go("abast")] };
      const m = map[a.kind]; if (!m) return;
      t.push({ prio: a.nivel === "critico" ? 0 : m[0], icon: m[1], tone: NIVEIS[a.nivel]?.chip || m[2], titulo: a.titulo.split(" — ")[0], detalhe: a.detalhe, tag: a.tag, acao: m[3] });
    });
    return t.sort((x, y) => x.prio - y.prio);
  }, [veiculoId, data, alerts]);
  const pend = tarefas.filter((x) => !x.done).length;

  return (
    <div>
      <PageHead title="Minhas Pendências de Hoje" sub="Selecione a frota do dia — o sistema mostra tudo que precisa ser feito" actions={<HelpButton topic="minhas" />} />
      <div className="mb-4 max-w-md"><Sel value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}><option value="">Selecione sua frota do dia…</option>{meusVeics.map((x) => <option key={x.id} value={x.id}>{x.prefixo} · {x.placa || "s/ placa"}</option>)}</Sel></div>
      {!veiculoId ? <Empty icon={CheckCircle2} title="Selecione a frota do dia" sub="Ao escolher o veículo, aparecem automaticamente todas as tarefas e pendências em ordem de prioridade." />
      : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: BRAND.sky, color: BRAND.navy }}><Truck size={22} /></div>
            <div className="flex-1"><p className="font-extrabold text-slate-900">{v.prefixo}{v.placa ? " · " + v.placa : ""}</p><p className="text-xs text-slate-500">{[v.marca, v.modelo].filter(Boolean).join(" ")} · {v.usaHorimetro ? fmtN(v.horimetro) + " h" : fmtN(v.kmAtual) + " km"}</p></div>
            {pend === 0 ? <Badge tone="green"><CheckCircle2 size={12} /> Tudo em dia</Badge> : <Badge tone="amber">{pend} pendência(s)</Badge>}
          </div>
          <div className="space-y-2">
            {tarefas.map((t, i) => {
              const Icon = t.icon;
              return (
                <button key={i} onClick={t.acao} className={"w-full text-left bg-white rounded-xl border p-3.5 flex items-center gap-3 hover:shadow-sm transition-all " + (t.done ? "border-slate-200 opacity-60" : "border-slate-200")}>
                  <div className="p-2 rounded-lg shrink-0" style={{ background: t.tone === "red" ? "#fee2e2" : t.tone === "amber" ? "#fef3c7" : t.tone === "blue" ? "#dbeafe" : "#dcfce7", color: t.tone === "red" ? BRAND.red : t.tone === "amber" ? BRAND.amber : t.tone === "blue" ? BRAND.royal : BRAND.green }}><Icon size={18} /></div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm text-slate-900">{t.done ? "✅ " : ""}{t.titulo}</p><p className="text-xs text-slate-500">{t.detalhe}</p></div>
                  {t.tag && <Badge tone={t.tone}>{t.tag}</Badge>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= CONFIGURAÇÕES / ALERTAS CONFIGURÁVEIS ================= */
function Configuracoes({ data, save }) {
  const [cfg, setCfg] = useState({ ...DEF_ALERTCFG, ...(data.settings.alertCfg || {}) });
  const set = (k, v) => setCfg({ ...cfg, [k]: v === "" ? "" : num(v) });
  const apply = () => save({ settings: { ...data.settings, alertCfg: { ...cfg } } }, "Atualizou parâmetros de alertas");
  const F = ({ k, label, hint }) => <Field label={label} hint={hint}><Inp type="number" value={cfg[k]} onChange={(e) => set(k, e.target.value)} /></Field>;
  return (
    <div>
      <PageHead title="Configurações" sub="Parâmetros de alertas — cada empresa define os seus" actions={<Btn onClick={apply}><CheckCircle2 size={15} /> Salvar</Btn>} />
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Alertas inteligentes</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <F k="calibIntervalDias" label="Intervalo de calibragem (dias)" />
          <F k="inspIntervalDias" label="Intervalo de inspeção (dias)" />
          <F k="sulcoMinimo" label="Sulco mínimo (mm)" />
          <F k="numSulcos" label="Sulcos por pneu (inspeção)" />
          <F k="consumoQuedaPct" label="Queda de consumo p/ alerta (%)" hint="km/l abaixo da média" />
          <F k="custoLimiteMes" label="Limite de custo mensal (R$)" hint="0 = sem limite" />
          <F k="diasParado" label="Dias parado p/ alerta" />
          <F k="prevKm" label="Preventiva padrão (km)" />
          <F k="prevHoras" label="Preventiva padrão (horas)" />
          <F k="prevDias" label="Preventiva padrão (dias)" />
        </div>
        <div className="mt-4 flex justify-end"><Btn onClick={apply}><CheckCircle2 size={15} /> Salvar parâmetros</Btn></div>
      </div>
    </div>
  );
}

/* ================= ADMINISTRAÇÃO (hub) ================= */
/* ================= CATÁLOGO DE PNEUS (Marca → Modelo → Medida) ================= */
// Helpers de acesso
const brandName = (data, id) => (data.tireBrands || []).find((b) => b.id === id)?.nome || "";
const modelName = (data, id) => (data.tireModels || []).find((m) => m.id === id)?.nome || "";
const sizeName = (data, id) => (data.tireSizes || []).find((s) => s.id === id)?.nome || "";
const modelsByBrand = (data, brandId) => (data.tireModels || []).filter((m) => m.marcaId === brandId);

/* ---- Seletor reutilizável com busca + botão "+" inline (sem perder o form) ---- */
function PickerPlus({ label, req, value, onChange, options, onCreate, placeholder, disabled, hint, renderOpt }) {
  // options: [{id, nome, extra?}]
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef();
  const sel = options.find((o) => o.id === value);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const filt = options.filter((o) => (o.nome + " " + (o.extra || "")).toLowerCase().includes(q.toLowerCase()));
  return (
    <Field label={label} req={req} hint={hint}>
      <div className="relative" ref={ref}>
        <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)}
          className={inpCls + " text-left flex items-center justify-between " + (disabled ? "opacity-50 cursor-not-allowed" : "")}>
          <span className={sel ? "text-slate-900" : "text-slate-400"}>{sel ? (renderOpt ? renderOpt(sel) : sel.nome) : (placeholder || "Selecione…")}</span>
          <ChevronDown size={15} className="text-slate-400 shrink-0" />
        </button>
        {open && !disabled && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100">
              <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" /><input autoFocus className={inpCls + " pl-8 py-1.5"} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            </div>
            <div className="overflow-y-auto">
              {filt.length === 0 && <p className="text-xs text-slate-400 px-3 py-3 text-center">Nenhum resultado.</p>}
              {filt.map((o) => (
                <button key={o.id} type="button" onClick={() => { onChange(o.id); setOpen(false); setQ(""); }}
                  className={"w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between " + (o.id === value ? "bg-blue-50 font-semibold" : "")}>
                  <span>{renderOpt ? renderOpt(o) : o.nome}</span>{o.id === value && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
            {onCreate && (
              <button type="button" onClick={() => { setOpen(false); onCreate(q); setQ(""); }}
                className="border-t border-slate-100 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-1.5">
                <Plus size={14} /> Cadastrar {q ? "“" + q + "”" : "novo"}
              </button>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

/* ---- Modais rápidos de criação (usados inline no cadastro de pneu) ---- */
function BrandQuickModal({ initial, data, save, onDone, onCancel }) {
  const [v, setV] = useState({ nome: initial || "", codigo: "", logo: [] });
  const submit = () => {
    if (!v.nome.trim()) return;
    if ((data.tireBrands || []).some((b) => b.nome.trim().toLowerCase() === v.nome.trim().toLowerCase())) { alert("Já existe uma marca com esse nome."); return; }
    const rec = { id: uid(), nome: v.nome.trim(), codigo: v.codigo.trim(), logo: (v.logo || [])[0] || "", criadoEm: nowISO() };
    save({ tireBrands: [...(data.tireBrands || []), rec] }, "Cadastrou marca de pneu " + rec.nome);
    onDone(rec.id);
  };
  return (
    <Modal title="Cadastrar marca" onClose={onCancel} w="max-w-md"
      footer={<><Btn v="sec" onClick={onCancel}>Cancelar</Btn><Btn onClick={submit} disabled={!v.nome.trim()}>Salvar</Btn></>}>
      <div className="space-y-3">
        <Field label="Nome da marca" req><Inp autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: Michelin" /></Field>
        <Field label="Código auxiliar"><Inp value={v.codigo} onChange={(e) => setV({ ...v, codigo: e.target.value })} /></Field>
        <Field label="Logotipo (opcional)"><PhotoInput label="Logo da marca" max={1} photos={v.logo} onChange={(ps) => setV({ ...v, logo: ps })} /></Field>
      </div>
    </Modal>
  );
}
function ModelQuickModal({ initial, marcaId, data, save, onDone, onCancel }) {
  const [v, setV] = useState({ nome: initial || "", marcaId: marcaId || "", desenho: "", qtdSulcos: "", mmNovo: "", codigo: "" });
  const submit = () => {
    if (!v.nome.trim() || !v.marcaId) return;
    if ((data.tireModels || []).some((m) => m.marcaId === v.marcaId && m.nome.trim().toLowerCase() === v.nome.trim().toLowerCase())) { alert("Essa marca já tem um modelo com esse nome."); return; }
    const rec = { id: uid(), nome: v.nome.trim(), marcaId: v.marcaId, desenho: v.desenho, qtdSulcos: num(v.qtdSulcos) || "", mmNovo: num(v.mmNovo) || "", codigo: v.codigo.trim(), criadoEm: nowISO() };
    save({ tireModels: [...(data.tireModels || []), rec] }, "Cadastrou modelo de pneu " + rec.nome);
    onDone(rec.id);
  };
  const brands = (data.tireBrands || []).map((b) => ({ id: b.id, nome: b.nome }));
  return (
    <Modal title="Cadastrar modelo" sub="Todo modelo pertence a uma marca" onClose={onCancel} w="max-w-lg"
      footer={<><Btn v="sec" onClick={onCancel}>Cancelar</Btn><Btn onClick={submit} disabled={!v.nome.trim() || !v.marcaId}>Salvar</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label="Marca vinculada" req><Sel value={v.marcaId} onChange={(e) => setV({ ...v, marcaId: e.target.value })}><option value="">Selecione a marca…</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</Sel></Field></div>
        <div className="sm:col-span-2"><Field label="Nome do modelo" req><Inp autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: X Multi Z" /></Field></div>
        <Field label="Desenho / banda"><Inp list="dl-desenho" value={v.desenho} onChange={(e) => setV({ ...v, desenho: e.target.value })} placeholder="Liso, Misto…" /><datalist id="dl-desenho">{DESENHOS_PNEU.map((d) => <option key={d} value={d} />)}</datalist></Field>
        <Field label="Qtd. de sulcos"><Inp type="number" value={v.qtdSulcos} onChange={(e) => setV({ ...v, qtdSulcos: e.target.value })} /></Field>
        <Field label="Sulco novo (mm)"><Inp type="number" step="0.1" value={v.mmNovo} onChange={(e) => setV({ ...v, mmNovo: e.target.value })} placeholder="16" /></Field>
        <Field label="Código auxiliar"><Inp value={v.codigo} onChange={(e) => setV({ ...v, codigo: e.target.value })} /></Field>
      </div>
      {!v.marcaId && (data.tireBrands || []).length === 0 && <p className="text-xs text-amber-700 mt-2"><Info size={12} className="inline" /> Cadastre uma marca primeiro (em Administração › Pneus: Marcas).</p>}
    </Modal>
  );
}
function SizeQuickModal({ initial, data, save, onDone, onCancel }) {
  const [v, setV] = useState({ nome: initial || "" });
  const norm = (s) => s.trim().toUpperCase().replace(/\s+/g, " ");
  const submit = () => {
    if (!v.nome.trim()) return;
    const n = norm(v.nome);
    if ((data.tireSizes || []).some((s) => norm(s.nome) === n)) { alert("Essa medida já está cadastrada."); return; }
    const rec = { id: uid(), nome: n, criadoEm: nowISO() };
    save({ tireSizes: [...(data.tireSizes || []), rec] }, "Cadastrou medida de pneu " + rec.nome);
    onDone(rec.id);
  };
  return (
    <Modal title="Cadastrar medida" sub="Padronizada para evitar duplicidade" onClose={onCancel} w="max-w-md"
      footer={<><Btn v="sec" onClick={onCancel}>Cancelar</Btn><Btn onClick={submit} disabled={!v.nome.trim()}>Salvar</Btn></>}>
      <Field label="Medida" req><Inp autoFocus value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: 295/80 R22.5" /></Field>
      <p className="text-[11px] text-slate-400 mt-2">A medida é padronizada em maiúsculas e pode ser reutilizada em qualquer marca/modelo.</p>
    </Modal>
  );
}

/* ---- Trio de seletores em cascata (Marca → Modelo → Medida) com + inline ---- */
// Uso: <TireCatalogPicker value={{marcaId,modeloId,medidaId}} onChange={(patch)=>...} data={data} save={save} />
function TireCatalogPicker({ value, onChange, data, save }) {
  const [quick, setQuick] = useState(null); // {tipo:'brand'|'model'|'size', initial}
  const brands = (data.tireBrands || []).map((b) => ({ id: b.id, nome: b.nome, extra: b.codigo }));
  const models = modelsByBrand(data, value.marcaId).map((m) => ({ id: m.id, nome: m.nome, extra: m.desenho }));
  const sizes = (data.tireSizes || []).map((s) => ({ id: s.id, nome: s.nome }));
  return (
    <>
      <PickerPlus label="Marca" req value={value.marcaId || ""} options={brands}
        onChange={(id) => onChange({ marcaId: id, modeloId: "" })}
        onCreate={(txt) => setQuick({ tipo: "brand", initial: txt })} placeholder="Selecione a marca" />
      <PickerPlus label="Modelo" req value={value.modeloId || ""} options={models} disabled={!value.marcaId}
        onChange={(id) => { const m = (data.tireModels || []).find((x) => x.id === id); onChange({ modeloId: id, ...(m && m.mmNovo ? { mmNovo: m.mmNovo } : {}) }); }}
        onCreate={(txt) => setQuick({ tipo: "model", initial: txt })}
        placeholder={value.marcaId ? "Selecione o modelo" : "Escolha a marca primeiro"}
        hint={value.marcaId ? "Mostrando modelos da marca selecionada" : null}
        renderOpt={(o) => o.nome + (o.extra ? " · " + o.extra : "")} />
      <PickerPlus label="Medida" req value={value.medidaId || ""} options={sizes}
        onChange={(id) => onChange({ medidaId: id })}
        onCreate={(txt) => setQuick({ tipo: "size", initial: txt })} placeholder="Selecione a medida" />

      {quick?.tipo === "brand" && <BrandQuickModal initial={quick.initial} data={data} save={save} onCancel={() => setQuick(null)} onDone={(id) => { onChange({ marcaId: id, modeloId: "" }); setQuick(null); }} />}
      {quick?.tipo === "model" && <ModelQuickModal initial={quick.initial} marcaId={value.marcaId} data={data} save={save} onCancel={() => setQuick(null)} onDone={(id) => { onChange({ modeloId: id }); setQuick(null); }} />}
      {quick?.tipo === "size" && <SizeQuickModal initial={quick.initial} data={data} save={save} onCancel={() => setQuick(null)} onDone={(id) => { onChange({ medidaId: id }); setQuick(null); }} />}
    </>
  );
}

/* ================= ADMIN: CADASTRO DE MARCAS ================= */
function CadMarcas({ data, save }) {
  const [edit, setEdit] = useState(null); const [q, setQ] = useState(""); const [zoom, setZoom] = useState(null);
  const rows = (data.tireBrands || []).filter((b) => (b.nome + " " + (b.codigo || "")).toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!edit.nome.trim()) return;
    if ((data.tireBrands || []).some((b) => b.id !== edit.id && b.nome.trim().toLowerCase() === edit.nome.trim().toLowerCase())) { alert("Já existe uma marca com esse nome."); return; }
    const rec = { ...edit, nome: edit.nome.trim(), logo: (edit.logoArr || [])[0] ?? edit.logo ?? "" }; delete rec.logoArr;
    const list = edit.id ? data.tireBrands.map((b) => b.id === edit.id ? rec : b) : [...(data.tireBrands || []), { ...rec, id: uid(), criadoEm: nowISO() }];
    save({ tireBrands: list }, (edit.id ? "Editou" : "Cadastrou") + " marca de pneu " + rec.nome); setEdit(null);
  };
  const del = (b) => {
    const emUso = (data.tireModels || []).some((m) => m.marcaId === b.id) || (data.tires || []).some((t) => t.marcaId === b.id);
    if (emUso) { alert("Não é possível remover: existem modelos ou pneus vinculados a esta marca."); return; }
    if (!confirm("Remover a marca " + b.nome + "?")) return;
    save({ tireBrands: data.tireBrands.filter((x) => x.id !== b.id) }, "Removeu marca " + b.nome);
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3"><h3 className="font-bold text-slate-800">Marcas de pneus</h3><Btn sm onClick={() => setEdit({ nome: "", codigo: "", logoArr: [] })}><Plus size={14} /> Cadastrar marca</Btn></div>
      <div className="relative mb-3 max-w-sm"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className={inpCls + " pl-9"} placeholder="Buscar marca…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {(data.tireBrands || []).length === 0 ? <Empty icon={Package} title="Nenhuma marca cadastrada" sub="Cadastre as marcas de pneu (Michelin, Pirelli, Goodyear…) para reutilizar nos modelos e pneus.">{<Btn onClick={() => setEdit({ nome: "", codigo: "", logoArr: [] })}><Plus size={16} /> Cadastrar marca</Btn>}</Empty>
      : <DataTable onRow={(b) => setEdit({ ...b, logoArr: b.logo ? [b.logo] : [] })} cols={[
          { label: "Logo", render: (b) => b.logo ? <img src={b.logo} onClick={(e) => { e.stopPropagation(); setZoom(b.logo); }} className="w-8 h-8 rounded object-contain bg-slate-50 cursor-zoom-in" /> : <span className="text-slate-300">—</span> },
          { label: "Marca", render: (b) => <span className="font-semibold">{b.nome}</span> },
          { label: "Código", render: (b) => b.codigo || "—" },
          { label: "Modelos", right: true, render: (b) => modelsByBrand(data, b.id).length },
          { label: "", right: true, render: (b) => <button onClick={(e) => { e.stopPropagation(); del(b); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button> },
        ]} rows={rows} />}
      {edit && <Modal title={edit.id ? "Editar marca" : "Cadastrar marca"} onClose={() => setEdit(null)} w="max-w-md"
        footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome.trim()}>Salvar</Btn></>}>
        <div className="space-y-3">
          <Field label="Nome da marca" req><Inp autoFocus value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: Michelin" /></Field>
          <Field label="Código auxiliar"><Inp value={edit.codigo || ""} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></Field>
          <Field label="Logotipo (opcional)"><PhotoInput label="Logo da marca" max={1} photos={edit.logoArr || []} onChange={(ps) => setEdit({ ...edit, logoArr: ps })} /></Field>
        </div>
      </Modal>}
      {zoom && <Lightbox src={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ================= ADMIN: CADASTRO DE MODELOS ================= */
function CadModelos({ data, save }) {
  const [edit, setEdit] = useState(null); const [q, setQ] = useState(""); const [fMarca, setFMarca] = useState("");
  const rows = (data.tireModels || []).filter((m) => (!fMarca || m.marcaId === fMarca) && (m.nome + " " + (m.codigo || "") + " " + brandName(data, m.marcaId)).toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!edit.nome.trim() || !edit.marcaId) return;
    if ((data.tireModels || []).some((m) => m.id !== edit.id && m.marcaId === edit.marcaId && m.nome.trim().toLowerCase() === edit.nome.trim().toLowerCase())) { alert("Essa marca já tem um modelo com esse nome."); return; }
    const rec = { ...edit, nome: edit.nome.trim(), qtdSulcos: num(edit.qtdSulcos) || "", mmNovo: num(edit.mmNovo) || "" };
    const list = edit.id ? data.tireModels.map((m) => m.id === edit.id ? rec : m) : [...(data.tireModels || []), { ...rec, id: uid(), criadoEm: nowISO() }];
    save({ tireModels: list }, (edit.id ? "Editou" : "Cadastrou") + " modelo de pneu " + rec.nome); setEdit(null);
  };
  const del = (m) => {
    if ((data.tires || []).some((t) => t.modeloId === m.id)) { alert("Não é possível remover: existem pneus vinculados a este modelo."); return; }
    if (!confirm("Remover o modelo " + m.nome + "?")) return;
    save({ tireModels: data.tireModels.filter((x) => x.id !== m.id) }, "Removeu modelo " + m.nome);
  };
  const semMarca = (data.tireBrands || []).length === 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3"><h3 className="font-bold text-slate-800">Modelos de pneus</h3><Btn sm onClick={() => setEdit({ nome: "", marcaId: fMarca || "", desenho: "", qtdSulcos: "", mmNovo: "", codigo: "" })} disabled={semMarca}><Plus size={14} /> Cadastrar modelo</Btn></div>
      {semMarca && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 mb-3 flex gap-2"><Info size={14} className="shrink-0 mt-0.5" /><span>Cadastre ao menos uma <b>marca</b> antes de criar modelos — todo modelo pertence a uma marca.</span></div>}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className={inpCls + " pl-9"} placeholder="Buscar modelo…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Sel value={fMarca} onChange={(e) => setFMarca(e.target.value)}><option value="">Todas as marcas</option>{(data.tireBrands || []).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</Sel>
      </div>
      {(data.tireModels || []).length === 0 ? <Empty icon={Package} title="Nenhum modelo cadastrado" sub="Cadastre modelos vinculados a uma marca, com desenho, sulcos e profundidade quando novo." />
      : <DataTable onRow={setEdit} cols={[
          { label: "Modelo", render: (m) => <span className="font-semibold">{m.nome}</span> },
          { label: "Marca", render: (m) => <Badge tone="navy">{brandName(data, m.marcaId)}</Badge> },
          { label: "Desenho", render: (m) => m.desenho || "—" },
          { label: "Sulcos", right: true, render: (m) => m.qtdSulcos || "—" },
          { label: "Sulco novo", right: true, render: (m) => m.mmNovo ? m.mmNovo + " mm" : "—" },
          { label: "", right: true, render: (m) => <button onClick={(e) => { e.stopPropagation(); del(m); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button> },
        ]} rows={rows} />}
      {edit && <Modal title={edit.id ? "Editar modelo" : "Cadastrar modelo"} sub="Todo modelo pertence a uma marca" onClose={() => setEdit(null)} w="max-w-lg"
        footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome.trim() || !edit.marcaId}>Salvar</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Field label="Marca vinculada" req><Sel value={edit.marcaId} onChange={(e) => setEdit({ ...edit, marcaId: e.target.value })}><option value="">Selecione a marca…</option>{(data.tireBrands || []).map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}</Sel></Field></div>
          <div className="sm:col-span-2"><Field label="Nome do modelo" req><Inp value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: X Multi Z" /></Field></div>
          <Field label="Desenho / banda"><Inp list="dl-desenho2" value={edit.desenho || ""} onChange={(e) => setEdit({ ...edit, desenho: e.target.value })} placeholder="Liso, Misto…" /><datalist id="dl-desenho2">{DESENHOS_PNEU.map((d) => <option key={d} value={d} />)}</datalist></Field>
          <Field label="Qtd. de sulcos"><Inp type="number" value={edit.qtdSulcos || ""} onChange={(e) => setEdit({ ...edit, qtdSulcos: e.target.value })} /></Field>
          <Field label="Sulco novo (mm)"><Inp type="number" step="0.1" value={edit.mmNovo || ""} onChange={(e) => setEdit({ ...edit, mmNovo: e.target.value })} placeholder="16" /></Field>
          <Field label="Código auxiliar"><Inp value={edit.codigo || ""} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></Field>
        </div>
      </Modal>}
    </div>
  );
}

/* ================= ADMIN: CADASTRO DE MEDIDAS ================= */
function CadMedidas({ data, save }) {
  const [edit, setEdit] = useState(null); const [q, setQ] = useState("");
  const norm = (s) => s.trim().toUpperCase().replace(/\s+/g, " ");
  const rows = (data.tireSizes || []).filter((s) => s.nome.toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!edit.nome.trim()) return;
    const n = norm(edit.nome);
    if ((data.tireSizes || []).some((s) => s.id !== edit.id && norm(s.nome) === n)) { alert("Essa medida já está cadastrada."); return; }
    const rec = { ...edit, nome: n };
    const list = edit.id ? data.tireSizes.map((s) => s.id === edit.id ? rec : s) : [...(data.tireSizes || []), { ...rec, id: uid(), criadoEm: nowISO() }];
    save({ tireSizes: list }, (edit.id ? "Editou" : "Cadastrou") + " medida de pneu " + rec.nome); setEdit(null);
  };
  const del = (s) => {
    if ((data.tires || []).some((t) => t.medidaId === s.id)) { alert("Não é possível remover: existem pneus com esta medida."); return; }
    if (!confirm("Remover a medida " + s.nome + "?")) return;
    save({ tireSizes: data.tireSizes.filter((x) => x.id !== s.id) }, "Removeu medida " + s.nome);
  };
  const usoCount = (sid) => (data.tires || []).filter((t) => t.medidaId === sid).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3"><h3 className="font-bold text-slate-800">Medidas de pneus</h3><Btn sm onClick={() => setEdit({ nome: "" })}><Plus size={14} /> Cadastrar medida</Btn></div>
      <div className="relative mb-3 max-w-sm"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className={inpCls + " pl-9"} placeholder="Buscar medida…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {(data.tireSizes || []).length === 0 ? <Empty icon={CircleDot} title="Nenhuma medida cadastrada" sub="Cadastre as medidas (ex.: 295/80 R22.5) uma vez e reutilize em qualquer marca e modelo.">{<Btn onClick={() => setEdit({ nome: "" })}><Plus size={16} /> Cadastrar medida</Btn>}</Empty>
      : <DataTable onRow={setEdit} cols={[
          { label: "Medida", render: (s) => <span className="font-semibold">{s.nome}</span> },
          { label: "Pneus com esta medida", right: true, render: (s) => usoCount(s.id) },
          { label: "", right: true, render: (s) => <button onClick={(e) => { e.stopPropagation(); del(s); }} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button> },
        ]} rows={rows} />}
      {edit && <Modal title={edit.id ? "Editar medida" : "Cadastrar medida"} sub="Padronizada para evitar duplicidade" onClose={() => setEdit(null)} w="max-w-md"
        footer={<><Btn v="sec" onClick={() => setEdit(null)}>Cancelar</Btn><Btn onClick={submit} disabled={!edit.nome.trim()}>Salvar</Btn></>}>
        <Field label="Medida" req><Inp autoFocus value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: 295/80 R22.5" /></Field>
        <p className="text-[11px] text-slate-400 mt-2">Será padronizada em maiúsculas. Reutilizável em qualquer marca/modelo.</p>
      </Modal>}
    </div>
  );
}

function Administracao({ data, save, user, sub }) {
  // sub define qual sub-tela renderizar
  switch (sub) {
    case "combustiveis": return <CadCombustiveis data={data} save={save} />;
    case "diagramas": return <CadDiagramas data={data} save={save} />;
    case "tiposequip": return <CadTiposEquip data={data} save={save} />;
    case "marcas": return <CadMarcas data={data} save={save} />;
    case "modelos": return <CadModelos data={data} save={save} />;
    case "medidas": return <CadMedidas data={data} save={save} />;
    case "config": return <Configuracoes data={data} save={save} />;
    default: return null;
  }
}

/* ================= APP PRINCIPAL ================= */
// Navegação em grupos (accordion). item: [pageId, label, mod]
const NAVGROUPS = [
  { id: "g-inicio", label: "Início", icon: LayoutDashboard, items: [["dash", "Dashboard", "dash"], ["minhas", "Minhas Pendências", "checklist"]] },
  { id: "g-frotas", label: "Frotas", icon: Truck, items: [["veiculos", "Cadastro", "veiculos"], ["checklist", "Checklist", "checklist"], ["resumo", "Resumo Checklists", "resumo"], ["abast", "Abastecimento", "abast"], ["custos", "Custos", "custos"], ["manut", "Manutenções", "manut"], ["os", "Ordens de Serviço", "os"], ["documentacao", "Documentação", "veiculos"], ["timeline", "Histórico", "timeline"]] },
  { id: "g-pneus", label: "Pneus", icon: CircleDot, items: [["pneus", "Cadastro & Estoque", "pneus"], ["calibragem", "Calibragens", "pneus"], ["inspecao", "Inspeções", "pneus"], ["adm-marcas", "Marcas", "pneus"], ["adm-modelos", "Modelos", "pneus"], ["adm-medidas", "Medidas", "pneus"]] },
  { id: "g-rel", label: "Relatórios", icon: FileText, items: [["rel", "Central de Relatórios", "rel"]] },
  { id: "g-ia", label: "Assistente IA", icon: Sparkles, items: [["ia", "Gerente Virtual", "ia"], ["notif", "Alertas", "notif"]] },
  { id: "g-admin", label: "Administração", icon: ShieldCheck, items: [["users", "Usuários & Permissões", "users"], ["adm-diagramas", "Diagramas", "users"], ["adm-combustiveis", "Combustíveis", "users"], ["adm-tiposequip", "Tipos de Equipamento", "users"], ["adm-config", "Configurações", "users"], ["ajuda", "Central de Ajuda", null], ["audit", "Auditoria", "audit"]] },
];

export default function App() {
  const [booted, setBooted] = useState(false);
  const [data, setData] = useState(EMPTY);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dash");
  const [sidebar, setSidebar] = useState(false);
  const [focusVeic, setFocusVeic] = useState(null);
  const [seedOS, setSeedOS] = useState(null);
  const [openGroup, setOpenGroup] = useState("g-inicio");

  const [bootErr, setBootErr] = useState("");
  useEffect(() => {
    let done = false;
    // Trava de segurança: nunca deixa a tela "Carregando" presa para sempre.
    const safety = setTimeout(() => { if (!done) { console.warn("Boot excedeu 12s — liberando app com dados locais."); setBooted(true); } }, 12000);
    (async () => {
      let loaded = {};
      try {
        // Carrega TODOS os domínios numa única operação (1 query no Supabase).
        loaded = await loadAll(DOMAINS, EMPTY);
      } catch (e) {
        console.error("Erro no carregamento inicial:", e);
        setBootErr("Não foi possível carregar todos os dados do servidor. O app abriu com os dados disponíveis.");
        DOMAINS.forEach((d) => { if (loaded[d] === undefined) loaded[d] = EMPTY[d]; });
      }
      loaded.settings = { ...EMPTY.settings, ...(loaded.settings || {}) };
      setPermOverrides(loaded.settings.permOverrides || {});
      setData((prev) => ({ ...prev, ...EMPTY, ...loaded }));
      done = true; clearTimeout(safety);
      setBooted(true);
    })();
    return () => clearTimeout(safety);
  }, []);

  const persist = async (patch) => { for (const k of Object.keys(patch)) await store.save(k, patch[k]); };

  const save = (patch, logAcao) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      if (logAcao && user) { next.audit = [...prev.audit, { id: uid(), ts: nowISO(), usuario: user.nome, perfil: user.perfil, acao: logAcao }]; persist({ audit: next.audit }); }
      persist(patch);
      return next;
    });
  };

  const seedAdmin = () => {
    const admin = { id: uid(), nome: "Administrador", login: "admin", senha: enc("admin"), perfil: "admin", ativo: true, criadoEm: nowISO() };
    const users = [admin];
    const erp = seedErp();
    setData((p) => ({ ...p, users, ...erp })); persist({ users, ...erp });
  };

  const alerts = useMemo(() => (booted ? buildAlerts(data) : []), [data, booted]);

  const genOS = (a) => {
    const v = data.vehicles.find((x) => x.id === a.veiculoId);
    setSeedOS({ numero: "OS-" + String(data.settings.proxOS || 1).padStart(5, "0"), tipo: "Preventiva", prioridade: a.nivel === "critico" ? "urgente" : "alta", status: "aberta", dataAbertura: todayISO(), veiculoId: a.veiculoId, km: v?.kmAtual || "", servicos: a.titulo.split(" — ")[0] + " (gerada a partir de alerta preventivo)", planoId: a.planoId, pecas: [] });
    setPage("os");
  };
  const go = (p) => { setPage(p); setSidebar(false); };

  if (!booted) return <div className="min-h-screen grid place-items-center bg-slate-50"><div className="text-center"><img src={LOGO} alt="Kairos" className="h-14 w-auto mx-auto mb-4 object-contain opacity-90" /><Spin label="Carregando Kairos Frota…" /></div></div>;
  if (!user) return <Login users={data.users} bootErr={bootErr} onLogin={(u) => { setUser(u); setPage(can(u, "dash", "view") ? "dash" : can(u, "checklist", "view") ? "minhas" : "abast"); setData((p) => { const audit = [...p.audit, { id: uid(), ts: nowISO(), usuario: u.nome, perfil: u.perfil, acao: "Entrou no sistema" }]; persist({ audit }); return { ...p, audit }; }); }} onSeed={seedAdmin} />;

  const critCount = alerts.filter((a) => a.nivel === "critico").length;

  const render = () => {
    switch (page) {
      case "dash": return <Dashboard data={data} alerts={alerts} go={go} onOS={genOS} user={user} />;
      case "minhas": return <MinhasPendencias data={data} alerts={alerts} go={go} user={user} />;
      case "checklist": return <Checklist data={data} save={save} user={user} />;
      case "resumo": return <ResumoChecklists data={data} go={go} />;
      case "veiculos": return <Veiculos data={data} save={save} user={user} focus={focusVeic} clearFocus={() => setFocusVeic(null)} />;
      case "documentacao": return <Documentacao data={data} save={save} user={user} />;
      case "abast": return <Abastecimento data={data} save={save} user={user} />;
      case "custos": return <Custos data={data} save={save} user={user} />;
      case "manut": return <Manutencao data={data} save={save} user={user} alerts={alerts} onOS={genOS} />;
      case "os": return <OrdensServico data={data} save={save} user={user} seedOS={seedOS} clearSeed={() => setSeedOS(null)} />;
      case "pneus": return <Pneus data={data} save={save} user={user} />;
      case "calibragem": return <Calibragem data={data} save={save} user={user} />;
      case "inspecao": return <Inspecao data={data} save={save} user={user} />;
      case "timeline": return <Timeline data={data} />;
      case "ia": return <IA data={data} save={save} user={user} />;
      case "rel": return <Relatorios data={data} />;
      case "notif": return <Notificacoes alerts={alerts} onOS={genOS} user={user} go={go} />;
      case "users": return <Usuarios data={data} save={save} user={user} />;
      case "adm-combustiveis": return <Administracao data={data} save={save} user={user} sub="combustiveis" />;
      case "adm-diagramas": return <Administracao data={data} save={save} user={user} sub="diagramas" />;
      case "adm-tiposequip": return <Administracao data={data} save={save} user={user} sub="tiposequip" />;
      case "adm-marcas": return <Administracao data={data} save={save} user={user} sub="marcas" />;
      case "adm-modelos": return <Administracao data={data} save={save} user={user} sub="modelos" />;
      case "adm-medidas": return <Administracao data={data} save={save} user={user} sub="medidas" />;
      case "adm-config": return <Administracao data={data} save={save} user={user} sub="config" />;
      case "ajuda": return <CentralAjuda />;
      case "audit": return <Auditoria data={data} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {sidebar && <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={() => setSidebar(false)} />}
      <aside className={"fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 flex flex-col transition-transform " + (sidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{ background: BRAND.navy }}>
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="bg-white rounded-lg p-1.5 shrink-0"><img src={LOGO} alt="Kairos" className="h-9 w-9 object-contain" /></div>
          <div><p className="text-white font-extrabold leading-tight" style={{ fontFamily: "Archivo, sans-serif" }}>Kairos Frota</p><p className="text-white/50 text-[11px]">Gestão Inteligente</p></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
          {NAVGROUPS.map((g) => {
            const items = g.items.filter(([, , mod]) => !mod || can(user, mod, "view"));
            if (items.length === 0) return null;
            const GIcon = g.icon;
            const isOpen = openGroup === g.id;
            const hasActive = items.some(([pid]) => pid === page);
            return (
              <div key={g.id}>
                <button onClick={() => setOpenGroup(isOpen ? "" : g.id)} className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors " + (hasActive && !isOpen ? "text-white bg-white/10" : "text-white/80 hover:bg-white/10")}>
                  <GIcon size={18} className="shrink-0" /> <span className="flex-1 text-left">{g.label}</span>
                  {g.id === "g-ia" && critCount > 0 && <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{critCount}</span>}
                  <ChevronDown size={15} className={"shrink-0 transition-transform " + (isOpen ? "rotate-180" : "")} />
                </button>
                {isOpen && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-white/15 space-y-0.5">
                    {items.map(([pid, label]) => (
                      <button key={pid} onClick={() => go(pid)} className={"w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors " + (page === pid ? "bg-white text-slate-900" : "text-white/70 hover:bg-white/10")}>
                        <span className="flex-1 text-left">{label}</span>
                        {pid === "notif" && critCount > 0 && <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5">{critCount}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/15 grid place-items-center text-white text-xs font-bold shrink-0">{user.nome.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0"><p className="text-white text-xs font-bold truncate">{user.nome}</p><p className="text-white/50 text-[10px]">{PERFIS[user.perfil]}</p></div>
          </div>
          <button onClick={() => { setUser(null); setSidebar(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white/70 hover:bg-white/10"><LogOut size={15} /> Sair</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebar(true)} className="p-1.5 rounded-lg hover:bg-slate-100"><Menu size={20} /></button>
          <img src={LOGO} alt="Kairos" className="h-7 w-7 object-contain" />
          <span className="font-extrabold text-slate-900" style={{ fontFamily: "Archivo, sans-serif" }}>Kairos Frota</span>
          {critCount > 0 && <button onClick={() => go("notif")} className="ml-auto relative"><Bell size={20} className="text-slate-600" /><span className="absolute -top-1 -right-1 text-[9px] font-bold text-white bg-red-500 rounded-full px-1">{critCount}</span></button>}
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{render()}</main>
        <footer className="text-center text-[11px] text-slate-400 py-4 px-4">Kairos Frota · ERP de Gestão de Frotas · Kairos Telecom / Kaironanet Ltda — Pentecoste/CE · {hasSupabase ? "Dados sincronizados na nuvem (Supabase)" : "Dados salvos localmente neste navegador"}</footer>
      </div>
    </div>
  );
}
