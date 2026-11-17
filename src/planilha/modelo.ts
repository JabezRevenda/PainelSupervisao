/**
 * Versão "planilha" do painel: lê o Relatório de leads e conversão (follow-up)
 * importado por scripts/importar_planilha.py e calcula os números das telas.
 *
 * Regras (as mesmas da planilha):
 *  - Leads: "Oportunidades Geradas" do mês (soma do dia a dia).
 *  - Lead recebido pelo vendedor = linha da lista "ID DO LEAD": o SDR (ou a IA)
 *    passa o lead já com a reunião agendada.
 *  - Reunião realizada = coluna "Realizada" igual a Sim. Não = não compareceu.
 *    Vazio ou Pendente = ainda sem desfecho.
 *  - Ganho = status Ganho ou Cadastrado (o "Concluídos" da planilha).
 *  - Perdido = status Perdido, Resgate ou Limbo.
 *  - Tudo conta no mês da aba em que o lead está, como na planilha.
 */
import { PARAMETROS_PADRAO } from '@/data/params';
import { businessDaysOfMonth, DAY, fromWall, monthKey, weekday } from '@/data/time';
import type { Etapa, Parametros } from '@/data/types';

export type Realizada = 'sim' | 'nao' | 'pendente';

export interface LinhaPlanilha {
  id: string;
  vendedor: string;
  data: string | null;
  canal: string;
  tipo: 'demonstracao' | 'negociacao_direta';
  realizada: Realizada;
  sdr: string;
  status: string;
}

export interface DiaPlanilha {
  data: string;
  leads: number | null;
  reunioes: number | null;
  perdidos: number | null;
  obs: string;
}

export interface MesPlanilha {
  chave: string;
  nome: string;
  leads: number | null;
  leadsAte: string | null;
  perdidosDia: number | null;
  meta: number | null;
  diario: DiaPlanilha[];
  lista: LinhaPlanilha[];
}

export interface DadosPlanilha {
  arquivo: string;
  importadoEm: string;
  atualizadoAte: string | null;
  meses: MesPlanilha[];
}

export type Resultado = 'aberto' | 'ganho' | 'perdido';

/** Um lead da lista, já com o mês, o instante e o resultado. */
export interface LeadP extends LinhaPlanilha {
  uid: string;
  mes: string;
  /** Meia-noite (São Paulo) da data da linha, ou o dia 1 do mês quando a planilha não traz data */
  t: number;
  semData: boolean;
  resultado: Resultado;
  coluna: Etapa;
}

/** Feriados descontados: a planilha marca os feriados nacionais como "Feriado". */
export const PARAMS_PLANILHA: Parametros = { ...PARAMETROS_PADRAO, descontarFeriados: true };

export function diaParaT(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return fromWall(y, m - 1, d);
}

export function chaveParaT(chave: string): number {
  const [y, m] = chave.split('-').map(Number);
  return fromWall(y, m - 1, 1);
}

export function resultadoDe(status: string): Resultado {
  const s = status.toLowerCase();
  if (s === 'ganho' || s === 'cadastrado') return 'ganho';
  if (s === 'perdido' || s === 'resgate' || s === 'limbo') return 'perdido';
  return 'aberto';
}

/** Coluna do Kanban do CRM em que o lead estaria. */
export function colunaDe(l: LinhaPlanilha): Etapa {
  const r = resultadoDe(l.status);
  if (r === 'ganho') return 'cadastrado';
  if (r === 'perdido') return l.status.toLowerCase() === 'resgate' ? 'resgate_sdr' : 'limbo_sdr';
  if (l.realizada === 'sim') return 'negociacao';
  if (l.realizada === 'nao') return 'reagendar_demo';
  return 'demo_agendada';
}

export function prepararLeads(dados: DadosPlanilha): LeadP[] {
  const out: LeadP[] = [];
  for (const m of dados.meses) {
    m.lista.forEach((l, i) => {
      out.push({
        ...l,
        uid: `${m.chave}-${i}`,
        mes: m.chave,
        t: l.data ? diaParaT(l.data) : chaveParaT(m.chave),
        semData: !l.data,
        resultado: resultadoDe(l.status),
        coluna: colunaDe(l),
      });
    });
  }
  return out;
}

export const pct = (n: number, d: number): number | null => (d > 0 ? (n / d) * 100 : null);

export interface Resumo {
  recebidos: number;
  realizadas: number;
  naoCompareceram: number;
  semDesfecho: number;
  ganhos: number;
  perdidos: number;
  abertos: number;
  /** ganhos ÷ leads recebidos */
  conversao: number | null;
  /** realizadas ÷ (realizadas + não compareceram) */
  comparecimento: number | null;
  /** realizadas ÷ recebidos */
  realizacao: number | null;
}

export function resumir(ls: LeadP[]): Resumo {
  let realizadas = 0, nao = 0, pend = 0, ganhos = 0, perdidos = 0, abertos = 0;
  for (const l of ls) {
    if (l.realizada === 'sim') realizadas++;
    else if (l.realizada === 'nao') nao++;
    else pend++;
    if (l.resultado === 'ganho') ganhos++;
    else if (l.resultado === 'perdido') perdidos++;
    else abertos++;
  }
  return {
    recebidos: ls.length,
    realizadas,
    naoCompareceram: nao,
    semDesfecho: pend,
    ganhos,
    perdidos,
    abertos,
    conversao: pct(ganhos, ls.length),
    comparecimento: pct(realizadas, realizadas + nao),
    realizacao: pct(realizadas, ls.length),
  };
}

export interface LinhaVendedorP extends Resumo {
  nome: string;
}

export function porVendedor(ls: LeadP[]): LinhaVendedorP[] {
  const m = new Map<string, LeadP[]>();
  for (const l of ls) (m.get(l.vendedor) ?? m.set(l.vendedor, []).get(l.vendedor)!).push(l);
  return [...m.entries()].map(([nome, xs]) => ({ nome, ...resumir(xs) })).sort((a, b) => b.recebidos - a.recebidos || b.ganhos - a.ganhos || a.nome.localeCompare(b.nome));
}

export interface LinhaCanalP extends Resumo {
  canal: string;
}

export function porCanal(ls: LeadP[]): LinhaCanalP[] {
  const m = new Map<string, LeadP[]>();
  for (const l of ls) (m.get(l.canal) ?? m.set(l.canal, []).get(l.canal)!).push(l);
  return [...m.entries()].map(([canal, xs]) => ({ canal, ...resumir(xs) })).sort((a, b) => b.recebidos - a.recebidos);
}

export interface PassoFunilP {
  chave: 'leads' | 'agendadas' | 'realizadas' | 'ganhos';
  rotulo: string;
  ajuda: string;
  n: number;
  /** % do passo anterior que chegou a este */
  conversao: number | null;
}

export const FUNIL_P: { chave: PassoFunilP['chave']; rotulo: string; ajuda: string }[] = [
  { chave: 'leads', rotulo: 'Leads recebidos', ajuda: 'todos os leads que entraram no mês' },
  { chave: 'agendadas', rotulo: 'Reuniões agendadas', ajuda: 'leads passados ao vendedor com reunião' },
  { chave: 'realizadas', rotulo: 'Reuniões realizadas', ajuda: 'o lead compareceu' },
  { chave: 'ganhos', rotulo: 'Ganhos', ajuda: 'status Ganho ou Cadastrado' },
];

export function funilDoMes(mes: MesPlanilha, ls: LeadP[]): PassoFunilP[] {
  const r = resumir(ls);
  const ns = [mes.leads ?? 0, r.recebidos, r.realizadas, r.ganhos];
  return FUNIL_P.map((p, i) => ({ ...p, n: ns[i], conversao: i === 0 ? null : pct(ns[i], ns[i - 1]) }));
}

export interface SemanaP {
  ini: number;
  fim: number;
  rotulo: string;
  agendadas: number;
  realizadas: number;
  naoCompareceram: number;
  semDesfecho: number;
}

/** Semanas (segunda a domingo) dentro do mês. */
export function porSemana(chave: string, ls: LeadP[]): SemanaP[] {
  const ini = chaveParaT(chave);
  const [y, m] = chave.split('-').map(Number);
  const fimMes = fromWall(y, m, 1);
  const semanas: SemanaP[] = [];
  let a = ini;
  let n = 1;
  while (a < fimMes) {
    const wd = weekday(a + 12 * 3600_000);
    let b = a + (((8 - wd) % 7) || 7) * DAY; // até a próxima segunda
    if (b > fimMes) b = fimMes;
    semanas.push({ ini: a, fim: b, rotulo: `Semana ${n++}`, agendadas: 0, realizadas: 0, naoCompareceram: 0, semDesfecho: 0 });
    a = b;
  }
  for (const l of ls) {
    if (l.semData) continue;
    const s = semanas.find((x) => l.t >= x.ini && l.t < x.fim);
    if (!s) continue;
    s.agendadas++;
    if (l.realizada === 'sim') s.realizadas++;
    else if (l.realizada === 'nao') s.naoCompareceram++;
    else s.semDesfecho++;
  }
  return semanas.filter((s) => s.agendadas > 0).map((s, i) => ({ ...s, rotulo: `Semana ${i + 1}` }));
}

export interface MetaMes {
  ganhos: number;
  meta: number | null;
  /** O mês selecionado é o mês corrente (há projeção) */
  corrente: boolean;
  projecao: number | null;
  faltam: number | null;
  ritmoAtual: number | null;
  ritmoNecessario: number | null;
  diasPassados: number;
  diasTotal: number;
  diasRestantes: number;
}

/**
 * Meta de cadastros do mês e projeção. A projeção só existe no mês corrente:
 * cadastros + ritmo × dias úteis restantes, com o ritmo dos primeiros dias
 * combinado com o do mês anterior (o mesmo critério do painel).
 */
export function metaDoMes(mes: MesPlanilha, ls: LeadP[], anterior: { mes: MesPlanilha; ls: LeadP[] } | null, agora: number, metaPadrao: number | null): MetaMes {
  const ganhos = ls.filter((l) => l.resultado === 'ganho').length;
  const meta = mes.meta ?? metaPadrao;
  const iniMes = chaveParaT(mes.chave);
  const corrente = monthKey(agora) === mes.chave;
  if (!corrente) {
    const tot = businessDaysOfMonth(iniMes, PARAMS_PLANILHA).total;
    return { ganhos, meta, corrente, projecao: null, faltam: meta === null ? null : Math.max(meta - ganhos, 0), ritmoAtual: tot ? ganhos / tot : null, ritmoNecessario: null, diasPassados: tot, diasTotal: tot, diasRestantes: 0 };
  }
  const { passados, total } = businessDaysOfMonth(agora, PARAMS_PLANILHA);
  const restantes = Math.max(total - passados, 0);
  const ritmo = passados > 0 ? ganhos / passados : 0;
  let ritmoHist = ritmo;
  if (anterior) {
    const g = anterior.ls.filter((l) => l.resultado === 'ganho').length;
    const d = businessDaysOfMonth(chaveParaT(anterior.mes.chave), PARAMS_PLANILHA).total;
    if (d > 0) ritmoHist = g / d;
  }
  const peso = passados / (passados + 5);
  const projecao = Math.round(ganhos + (peso * ritmo + (1 - peso) * ritmoHist) * restantes);
  return {
    ganhos,
    meta,
    corrente,
    projecao,
    faltam: meta === null ? null : Math.max(meta - ganhos, 0),
    ritmoAtual: ritmo,
    ritmoNecessario: meta === null || restantes <= 0 ? null : Math.max(meta - ganhos, 0) / restantes,
    diasPassados: passados,
    diasTotal: total,
    diasRestantes: restantes,
  };
}

/** Cores das origens: as do CRM quando existem, tons neutros para o resto. */
const COR_CANAL: Record<string, string> = {
  'Paid Search': '#EAB308',
  'Organic Search': '#C084FC',
  Direct: '#64748B',
  Referral: '#16A34A',
  Social: '#3B82F6',
  Indicação: '#8B5CF6',
  'Revenda Mais': '#EF4444',
  Renave: '#0EA5E9',
  Webmotors: '#F97316',
  'Webinar Renave': '#06B6D4',
  'Webinar Financeiro': '#14B8A6',
  WhatsApp: '#22C55E',
  'E-mail': '#A3A3A3',
};

export function corCanal(canal: string): string {
  return COR_CANAL[canal] ?? '#9CA3AF';
}

export const COLUNAS_KANBAN: Etapa[] = ['demo_agendada', 'reagendar_demo', 'negociacao', 'cadastrado', 'resgate_sdr', 'limbo_sdr'];

/** "03/11" a partir de "2026-11-03". */
export function fmtDia(iso: string | null): string {
  if (!iso) return 'sem data';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export const REALIZADA_INFO: Record<Realizada, { rotulo: string; cls: string; cor: string }> = {
  sim: { rotulo: 'Realizada', cls: 'border-ink bg-ink text-ink-foreground', cor: 'var(--ink)' },
  nao: { rotulo: 'Não compareceu', cls: 'border-primary/40 text-primary', cor: 'var(--primary)' },
  pendente: { rotulo: 'Sem desfecho', cls: 'border-warning bg-warning/15 text-warning-foreground', cor: 'var(--warning)' },
};
