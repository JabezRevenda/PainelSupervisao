/**
 * Indicadores do painel. Cada função corresponde a uma linha da tabela
 * "Indicadores e fórmulas" do plano.
 */
import {
  businessDaysOfMonth,
  DAY,
  HOUR,
  isBusinessDay,
  startOfDay,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  weekday,
  wall,
} from '../time';
import {
  CANAIS,
  type Canal,
  type Dataset,
  type Etapa,
  FUNIL,
  type Interacao,
  type Parametros,
  type PassoFunil,
} from '../types';
import { alertas, type LeadView, situacaoSla, type TipoAlerta } from './estado';

export function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function pct(n: number, d: number): number | null {
  return d > 0 ? (n / d) * 100 : null;
}

const noIntervalo = (t: number | null | undefined, ini: number, fim: number) => t != null && t >= ini && t < fim;

// ---------- atendimento ----------

export interface ResumoAtendimento {
  recebidos: number;
  noPrazo: number;
  avaliados: number;
  slaPct: number | null;
  medianaPrimeiroContatoMin: number | null;
  interacoes: number;
  interacoesPorLead: number | null;
  usoWhatsappCrmPct: number | null;
  retroativosPct: number | null;
}

/** Leads recebidos pelo vendedor no período e como foi o 1º contato. */
export function resumoAtendimento(
  views: LeadView[],
  ds: Dataset,
  p: Parametros,
  ini: number,
  fim: number,
  vendedorId?: string,
): ResumoAtendimento {
  const coorte = views.filter((v) => noIntervalo(v.recebidoEm, ini, fim) && (!vendedorId || v.vendedorId === vendedorId));
  let noPrazo = 0;
  let avaliados = 0;
  const tempos: number[] = [];
  for (const v of coorte) {
    const s = situacaoSla(v, ds.agora, p);
    if (s === 'correndo') continue;
    avaliados++;
    if (s === 'no_prazo') noPrazo++;
    if (v.primeiroContatoMin !== null) tempos.push(v.primeiroContatoMin);
  }
  const inter = ds.interacoes.filter((i) => noIntervalo(i.registradoEm, ini, fim) && (!vendedorId || i.usuarioId === vendedorId));
  const whatsapp = inter.filter((i) => i.tipo === 'whatsapp_enviado');
  const leadsTrabalhados = new Set(inter.map((i) => i.leadId)).size;
  return {
    recebidos: coorte.length,
    noPrazo,
    avaliados,
    slaPct: pct(noPrazo, avaliados),
    medianaPrimeiroContatoMin: mediana(tempos),
    interacoes: inter.length,
    interacoesPorLead: leadsTrabalhados ? inter.length / leadsTrabalhados : null,
    usoWhatsappCrmPct: pct(whatsapp.filter((i) => i.via === 'whatsapp_crm').length, whatsapp.length),
    retroativosPct: pct(inter.filter((i) => i.registradoEm - i.ocorridoEm > 15 * 60_000).length, inter.length),
  };
}

export interface DiaSerie {
  dia: number;
  recebidos: number;
  noPrazo: number;
  fora: number;
  correndo: number;
  medianaMin: number | null;
  interacoes: number;
}

/** Série por dia útil (últimos `n` dias úteis, incluindo hoje). */
export function serieDiaria(views: LeadView[], ds: Dataset, p: Parametros, n: number, vendedorId?: string): DiaSerie[] {
  const dias: number[] = [];
  for (let d = startOfDay(ds.agora); dias.length < n; d -= DAY) if (isBusinessDay(d, p)) dias.unshift(d);
  return dias.map((dia) => {
    const fim = dia + DAY;
    const coorte = views.filter((v) => noIntervalo(v.recebidoEm, dia, fim) && (!vendedorId || v.vendedorId === vendedorId));
    let noPrazo = 0;
    let fora = 0;
    let correndo = 0;
    const tempos: number[] = [];
    for (const v of coorte) {
      const s = situacaoSla(v, ds.agora, p);
      if (s === 'no_prazo') noPrazo++;
      else if (s === 'fora') fora++;
      else correndo++;
      if (v.primeiroContatoMin !== null) tempos.push(v.primeiroContatoMin);
    }
    const interacoes = ds.interacoes.filter((i) => noIntervalo(i.registradoEm, dia, fim) && (!vendedorId || i.usuarioId === vendedorId)).length;
    return { dia, recebidos: coorte.length, noPrazo, fora, correndo, medianaMin: mediana(tempos), interacoes };
  });
}

// ---------- carteira e alertas ----------

export interface ItemFila {
  view: LeadView;
  alertas: ReturnType<typeof alertas>;
}

export function fila(views: LeadView[], agora: number, p: Parametros): ItemFila[] {
  return views
    .filter((v) => v.status === 'aberto')
    .map((view) => ({ view, alertas: alertas(view, agora, p) }))
    .filter((x) => x.alertas.length > 0)
    .sort((a, b) => {
      const g = a.alertas[0].gravidade - b.alertas[0].gravidade;
      if (g !== 0) return g;
      if (a.alertas[0].tipo === 'prazo_correndo') return a.view.prazoSla - b.view.prazoSla;
      return b.view.horasSemInteracao - a.view.horasSemInteracao;
    });
}

export function contarAlertas(itens: ItemFila[]): Record<TipoAlerta, number> {
  const c: Record<TipoAlerta, number> = {
    sla_estourado: 0, parado: 0, prazo_correndo: 0, demo_sem_desfecho: 0, atencao: 0, passo_vencido: 0, sem_proximo_passo: 0,
  };
  for (const it of itens) for (const a of it.alertas) c[a.tipo]++;
  return c;
}

export interface Carteira {
  abertos: number;
  semContato: number;
  slaEstourado: number;
  parados: number;
  atencao: number;
  semProximoPasso: number;
  passoVencido: number;
  comProximoPassoPct: number | null;
  /** Em atenção que viram "parados" antes do fim do expediente de hoje */
  viramParadosHoje: number;
}

export function carteira(views: LeadView[], agora: number, p: Parametros, vendedorId?: string): Carteira {
  const abertos = views.filter((v) => v.status === 'aberto' && (!vendedorId || v.vendedorId === vendedorId));
  const fimExpediente = startOfDay(agora) + p.fimMin * 60_000;
  const horasAteFim = Math.max((fimExpediente - agora) / HOUR, 0);
  let semContato = 0, slaEstourado = 0, parados = 0, atencao = 0, semProximo = 0, vencido = 0, comProximo = 0, viram = 0;
  for (const v of abertos) {
    if (v.primeiroContatoEm === null) {
      semContato++;
      if (agora >= v.prazoSla) slaEstourado++;
    }
    if (v.horasSemInteracao >= p.paradoHoras) parados++;
    else if (v.horasSemInteracao >= p.atencaoHoras) {
      atencao++;
      if (p.paradoHoras - v.horasSemInteracao <= horasAteFim) viram++;
    }
    if (v.passoVencido) vencido++;
    if (v.proximoPasso || v.proximaDemo) comProximo++;
    else if (!v.passoVencido) semProximo++;
  }
  return {
    abertos: abertos.length,
    semContato,
    slaEstourado,
    parados,
    atencao,
    semProximoPasso: semProximo,
    passoVencido: vencido,
    comProximoPassoPct: pct(comProximo, abertos.length),
    viramParadosHoje: viram,
  };
}

// ---------- demos ----------

export interface ResumoDemos {
  realizadas: number;
  faltaram: number;
  semDesfecho: number;
  futuras: number;
  comparecimentoPct: number | null;
}

export function resumoDemos(views: LeadView[], agora: number, ini: number, fim: number, vendedorId?: string): ResumoDemos {
  let realizadas = 0, faltaram = 0, semDesfecho = 0, futuras = 0;
  for (const v of views) {
    for (const d of v.demos) {
      if (vendedorId && d.vendedorId !== vendedorId) continue;
      if (!noIntervalo(d.agendadaPara, ini, fim)) continue;
      if (d.status === 'realizada') realizadas++;
      else if (d.status === 'nao_compareceu') faltaram++;
      else if (d.agendadaPara + 60 * 60_000 < agora) semDesfecho++;
      else futuras++;
    }
  }
  return { realizadas, faltaram, semDesfecho, futuras, comparecimentoPct: pct(realizadas, realizadas + faltaram) };
}

// ---------- funil ----------

export interface EtapaFunil {
  etapa: PassoFunil;
  n: number;
  /** % que avançou do passo anterior para este */
  conversao: number | null;
  /** Dias corridos médios entre o passo anterior e este */
  diasMedios: number | null;
}

export function funil(views: LeadView[], ini: number, fim: number, filtro?: (v: LeadView) => boolean): EtapaFunil[] {
  const coorte = views.filter((v) => noIntervalo(v.recebidoEm, ini, fim) && (!filtro || filtro(v)));
  return FUNIL.map((etapa, i) => {
    const chegaram = coorte.filter((v) => v.passo[etapa] !== undefined);
    if (i === 0) return { etapa, n: coorte.length, conversao: null, diasMedios: null };
    const anterior = FUNIL[i - 1];
    const base = coorte.filter((v) => v.passo[anterior] !== undefined).length;
    const deltas = chegaram
      .map((v) => (v.passo[etapa]! - (v.passo[anterior] ?? v.recebidoEm)) / DAY)
      .filter((x) => x >= 0);
    return {
      etapa,
      n: chegaram.length,
      conversao: pct(chegaram.length, base),
      diasMedios: deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null,
    };
  });
}

export interface ResumoFechamento {
  ganhos: number;
  perdidos: number;
  taxaGanhoPct: number | null;
  cicloMedioDias: number | null;
  cicloMedianoDias: number | null;
  emAberto: number;
}

export function fechamento(views: LeadView[], ini: number, fim: number, vendedorId?: string): ResumoFechamento {
  const filt = views.filter((v) => !vendedorId || v.vendedorId === vendedorId);
  const ganhos = filt.filter((v) => v.status === 'ganho' && noIntervalo(v.fechadoEm, ini, fim));
  const perdidos = filt.filter((v) => v.status === 'perdido' && noIntervalo(v.fechadoEm, ini, fim));
  const ciclos = ganhos.map((v) => (v.fechadoEm! - v.recebidoEm) / DAY);
  const coorteAberta = filt.filter((v) => noIntervalo(v.recebidoEm, ini, fim) && v.status === 'aberto').length;
  return {
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    taxaGanhoPct: pct(ganhos.length, ganhos.length + perdidos.length),
    cicloMedioDias: ciclos.length ? ciclos.reduce((a, b) => a + b, 0) / ciclos.length : null,
    cicloMedianoDias: mediana(ciclos),
    emAberto: coorteAberta,
  };
}

// ---------- marketing ----------

export interface LinhaCanal {
  canal: Canal;
  leads: number;
  slaPct: number | null;
  comparecimentoPct: number | null;
  ganhos: number;
  conversaoPct: number | null;
  convNoPrazoPct: number | null;
  convForaPct: number | null;
  noPrazo: number;
  fora: number;
  perdaMaisComum: string | null;
}

function conversaoPorSla(coorte: LeadView[], agora: number, p: Parametros) {
  const dentro = coorte.filter((v) => situacaoSla(v, agora, p) === 'no_prazo');
  const fora = coorte.filter((v) => situacaoSla(v, agora, p) === 'fora');
  return {
    dentro: dentro.length,
    fora: fora.length,
    convDentro: pct(dentro.filter((v) => v.status === 'ganho').length, dentro.length),
    convFora: pct(fora.filter((v) => v.status === 'ganho').length, fora.length),
  };
}

export function porCanal(views: LeadView[], ds: Dataset, p: Parametros, ini: number, fim: number): LinhaCanal[] {
  return CANAIS.map((canal) => {
    const coorte = views.filter((v) => v.lead.canal === canal && noIntervalo(v.recebidoEm, ini, fim));
    const avaliados = coorte.filter((v) => situacaoSla(v, ds.agora, p) !== 'correndo');
    const noPrazo = avaliados.filter((v) => situacaoSla(v, ds.agora, p) === 'no_prazo').length;
    let realizadas = 0, faltaram = 0;
    for (const v of coorte) for (const d of v.demos) {
      if (d.status === 'realizada') realizadas++;
      if (d.status === 'nao_compareceu') faltaram++;
    }
    const perdas = new Map<string, number>();
    for (const v of coorte) if (v.motivoPerdaId) perdas.set(v.motivoPerdaId, (perdas.get(v.motivoPerdaId) ?? 0) + 1);
    const top = [...perdas.entries()].sort((a, b) => b[1] - a[1])[0];
    const sla = conversaoPorSla(coorte, ds.agora, p);
    const ganhos = coorte.filter((v) => v.status === 'ganho').length;
    return {
      canal,
      leads: coorte.length,
      slaPct: pct(noPrazo, avaliados.length),
      comparecimentoPct: pct(realizadas, realizadas + faltaram),
      ganhos,
      conversaoPct: pct(ganhos, coorte.length),
      convNoPrazoPct: sla.convDentro,
      convForaPct: sla.convFora,
      noPrazo: sla.dentro,
      fora: sla.fora,
      perdaMaisComum: top ? ds.motivos.find((m) => m.id === top[0])?.nome ?? null : null,
    };
  });
}

export function efeitoSla(views: LeadView[], ds: Dataset, p: Parametros, ini: number, fim: number) {
  const coorte = views.filter((v) => noIntervalo(v.recebidoEm, ini, fim));
  const r = conversaoPorSla(coorte, ds.agora, p);
  const dentroGanhos = coorte.filter((v) => situacaoSla(v, ds.agora, p) === 'no_prazo' && v.status === 'ganho').length;
  const foraGanhos = coorte.filter((v) => situacaoSla(v, ds.agora, p) === 'fora' && v.status === 'ganho').length;
  return {
    ...r,
    dentroGanhos,
    foraGanhos,
    multiplicador: r.convDentro !== null && r.convFora ? r.convDentro / r.convFora : null,
  };
}

export interface LinhaCampanha {
  campanha: string;
  canal: Canal;
  leads: number;
  slaPct: number | null;
  conversaoPct: number | null;
}

export function porCampanha(views: LeadView[], ds: Dataset, p: Parametros, ini: number, fim: number): LinhaCampanha[] {
  const grupos = new Map<string, LeadView[]>();
  for (const v of views) {
    if (!noIntervalo(v.recebidoEm, ini, fim) || !v.lead.utmCampaign) continue;
    const k = `${v.lead.canal}|${v.lead.utmCampaign}`;
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(v);
  }
  return [...grupos.entries()]
    .map(([k, vs]) => {
      const [canal, campanha] = k.split('|') as [Canal, string];
      const avaliados = vs.filter((v) => situacaoSla(v, ds.agora, p) !== 'correndo');
      return {
        campanha,
        canal,
        leads: vs.length,
        slaPct: pct(avaliados.filter((v) => situacaoSla(v, ds.agora, p) === 'no_prazo').length, avaliados.length),
        conversaoPct: pct(vs.filter((v) => v.status === 'ganho').length, vs.length),
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

// ---------- perdas ----------

export function perdas(views: LeadView[], ini: number, fim: number) {
  const perdidos = views.filter((v) => v.status === 'perdido' && noIntervalo(v.fechadoEm, ini, fim));
  const porMotivo = new Map<string, number>();
  const porEtapa = new Map<Etapa, number>();
  /** Para onde o lead foi: Resgate - SDR ou Limbo - SDR. */
  const porDestino = new Map<Etapa, number>();
  const porVendedor = new Map<string, { n: number; motivos: Map<string, number>; resgate: number }>();
  const semInteracao: LeadView[] = [];
  for (const v of perdidos) {
    const m = v.motivoPerdaId ?? 'sem_motivo';
    porMotivo.set(m, (porMotivo.get(m) ?? 0) + 1);
    const e = v.etapaPerda ?? 'demo_agendada';
    porEtapa.set(e, (porEtapa.get(e) ?? 0) + 1);
    porDestino.set(v.etapa, (porDestino.get(v.etapa) ?? 0) + 1);
    const pv = porVendedor.get(v.vendedorId) ?? { n: 0, motivos: new Map(), resgate: 0 };
    pv.n++;
    pv.motivos.set(m, (pv.motivos.get(m) ?? 0) + 1);
    if (v.etapa === 'resgate_sdr') pv.resgate++;
    porVendedor.set(v.vendedorId, pv);
    if (v.interacoes.filter((i) => i.registradoEm >= v.atribuidoEm).length === 0) semInteracao.push(v);
  }
  return { total: perdidos.length, porMotivo, porEtapa, porDestino, porVendedor, semInteracao };
}

// ---------- metas ----------

export function metasDoMes(views: LeadView[], agora: number, p: Parametros, metas: Record<string, number>, vendedores: string[]) {
  const ini = startOfMonth(agora);
  const fim = startOfNextMonth(agora);
  const { passados, total } = businessDaysOfMonth(agora, p);
  const porVendedor = vendedores.map((id) => {
    const ganhos = views.filter((v) => v.vendedorId === id && v.status === 'ganho' && noIntervalo(v.fechadoEm, ini, fim)).length;
    return { id, ganhos, meta: metas[id] ?? 0 };
  });
  const ganhos = porVendedor.reduce((s, x) => s + x.ganhos, 0);
  const meta = porVendedor.reduce((s, x) => s + x.meta, 0);
  const ritmo = passados > 0 ? ganhos / passados : 0;
  const restantes = Math.max(total - passados, 0);
  // Projeção: ganhos + ritmo esperado × dias úteis restantes. Nos primeiros dias o
  // ritmo do mês ainda é instável, então ele é combinado com o ritmo do mês anterior;
  // o peso do mês atual cresce a cada dia útil (5 dias = metade do peso).
  const iniAnterior = startOfMonth(ini - DAY);
  const ganhosAnterior = views.filter(
    (v) => v.status === 'ganho' && vendedores.includes(v.vendedorId) && noIntervalo(v.fechadoEm, iniAnterior, ini),
  ).length;
  const diasAnterior = businessDaysOfMonth(ini - DAY, p).total;
  const ritmoHistorico = diasAnterior > 0 ? ganhosAnterior / diasAnterior : ritmo;
  const peso = passados / (passados + 5);
  const ritmoProjetado = peso * ritmo + (1 - peso) * ritmoHistorico;
  const projecao = Math.round(ganhos + ritmoProjetado * restantes);
  return {
    ini,
    ganhos,
    meta,
    faltam: Math.max(meta - ganhos, 0),
    projecao,
    projecaoPct: meta ? (projecao / meta) * 100 : null,
    ganhosMesAnterior: ganhosAnterior,
    ritmoAtual: ritmo,
    ritmoNecessario: restantes > 0 ? Math.max(meta - ganhos, 0) / restantes : null,
    diasPassados: passados,
    diasTotal: total,
    diasRestantes: restantes,
    porVendedor,
  };
}

// ---------- mapa de atividade ----------

/** Interações por dia da semana (seg–sex) e hora (8h–17h) no período. */
export function mapaAtividade(interacoes: Interacao[], vendedorId: string, ini: number, fim: number): number[][] {
  const m = Array.from({ length: 5 }, () => Array(10).fill(0));
  for (const i of interacoes) {
    if (i.usuarioId !== vendedorId || !noIntervalo(i.registradoEm, ini, fim)) continue;
    const wd = weekday(i.registradoEm);
    const h = wall(i.registradoEm).getUTCHours();
    if (wd >= 1 && wd <= 5 && h >= 8 && h < 18) m[wd - 1][h - 8]++;
  }
  return m;
}

export function inicioSemana(agora: number) {
  return startOfWeek(agora);
}
