/**
 * Estado de cada lead no instante `agora`, montado a partir das tabelas da réplica.
 * Todas as regras de negócio do plano estão aqui (fonte única para todas as telas).
 */
import {
  businessMinutesBetween,
  hoursSkippingWeekends,
  MIN,
  slaDeadline,
} from '../time';
import type {
  Atribuicao,
  Dataset,
  Demo,
  Etapa,
  Interacao,
  Lead,
  MudancaEtapa,
  Parametros,
  PassoFunil,
  Tarefa,
} from '../types';
import { ETAPAS_PERDA } from '../types';

/** Uma demo é considerada "sem desfecho" 1 hora depois do horário marcado. */
export const TOLERANCIA_DESFECHO_MS = 60 * MIN;

export interface LeadView {
  lead: Lead;
  vendedorId: string;
  /** Última atribuição (o prazo de 1 hora conta daqui). */
  atribuidoEm: number;
  /** Primeira vez que o lead chegou a um vendedor (base das coortes). */
  recebidoEm: number;
  etapa: Etapa;
  status: 'aberto' | 'ganho' | 'perdido';
  fechadoEm: number | null;
  motivoPerdaId: string | null;
  /** Etapa em que estava quando foi perdido */
  etapaPerda: Etapa | null;
  historico: MudancaEtapa[];
  atribuicoes: Atribuicao[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  demos: Demo[];
  /** 1ª interação registrada depois da última atribuição */
  primeiroContatoEm: number | null;
  /** Minutos úteis entre a atribuição e o 1º contato */
  primeiroContatoMin: number | null;
  /** Instante de vencimento do SLA de 1º contato */
  prazoSla: number;
  ultimaInteracaoEm: number | null;
  /** Horas corridas (sem fim de semana) desde a última interação ou, sem interação, desde a atribuição */
  horasSemInteracao: number;
  proximoPasso: Tarefa | null;
  passoVencido: Tarefa | null;
  proximaDemo: Demo | null;
  demoSemDesfecho: Demo | null;
  /** Horário em que a etapa foi atingida pela primeira vez */
  atingiu: Partial<Record<Etapa, number>>;
  /** Horário de cada passo do funil do vendedor (inclui "demo realizada") */
  passo: Partial<Record<PassoFunil, number>>;
}

export type TipoAlerta =
  | 'sla_estourado'
  | 'parado'
  | 'prazo_correndo'
  | 'demo_sem_desfecho'
  | 'atencao'
  | 'passo_vencido'
  | 'sem_proximo_passo';

export interface Alerta {
  tipo: TipoAlerta;
  /** Menor = mais grave */
  gravidade: number;
  cor: 'vermelho' | 'amarelo';
  rotulo: string;
}

export const ALERTA_INFO: Record<TipoAlerta, { gravidade: number; cor: Alerta['cor']; rotulo: string }> = {
  sla_estourado: { gravidade: 0, cor: 'vermelho', rotulo: 'SLA estourado' },
  parado: { gravidade: 1, cor: 'vermelho', rotulo: 'Parado' },
  prazo_correndo: { gravidade: 2, cor: 'amarelo', rotulo: 'Prazo correndo' },
  demo_sem_desfecho: { gravidade: 3, cor: 'amarelo', rotulo: 'Demo sem desfecho' },
  atencao: { gravidade: 4, cor: 'amarelo', rotulo: 'Em atenção' },
  passo_vencido: { gravidade: 5, cor: 'amarelo', rotulo: 'Passo vencido' },
  sem_proximo_passo: { gravidade: 6, cor: 'amarelo', rotulo: 'Sem próximo passo' },
};

function agrupar<T extends { leadId: string }>(arr: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of arr) {
    const l = m.get(x.leadId);
    if (l) l.push(x);
    else m.set(x.leadId, [x]);
  }
  return m;
}

export function construirViews(ds: Dataset, p: Parametros): LeadView[] {
  const agora = ds.agora;
  const atrib = agrupar(ds.atribuicoes);
  const etapas = agrupar(ds.etapas);
  const inter = agrupar(ds.interacoes);
  const tarefas = agrupar(ds.tarefas);
  const demos = agrupar(ds.demos);
  const out: LeadView[] = [];

  for (const lead of ds.leads) {
    const atribuicoes = atrib.get(lead.id);
    if (!atribuicoes || atribuicoes.length === 0) continue; // ainda na pré-vendas
    const historico = etapas.get(lead.id) ?? [];
    const interacoes = inter.get(lead.id) ?? [];
    const tarefasLead = tarefas.get(lead.id) ?? [];
    const demosLead = demos.get(lead.id) ?? [];

    const ultimaAtrib = atribuicoes[atribuicoes.length - 1];
    const atribuidoEm = ultimaAtrib.em;
    const ultimaEtapa = historico[historico.length - 1];
    const etapa: Etapa = ultimaEtapa ? ultimaEtapa.para : 'demo_agendada';
    const status = etapa === 'cadastrado' ? 'ganho' : ETAPAS_PERDA.includes(etapa) ? 'perdido' : 'aberto';
    const fechadoEm = status === 'aberto' ? null : ultimaEtapa.em;

    const atingiu: Partial<Record<Etapa, number>> = {};
    for (const h of historico) if (atingiu[h.para] === undefined) atingiu[h.para] = h.em;
    const passo: Partial<Record<PassoFunil, number>> = {
      demo_agendada: atribuicoes[0].em,
      negociacao: atingiu.negociacao,
      cadastrado: atingiu.cadastrado,
    };

    const contato = interacoes.find((i) => i.registradoEm >= atribuidoEm) ?? null;
    const ultima = interacoes.length ? interacoes[interacoes.length - 1].registradoEm : null;
    const referencia = Math.max(ultima ?? 0, atribuidoEm);
    const fimRelogio = fechadoEm ?? agora;

    const pendentes = tarefasLead.filter((t) => t.concluidoEm === null);
    const proximoPasso = pendentes.filter((t) => t.previstoPara >= agora).sort((a, b) => a.previstoPara - b.previstoPara)[0] ?? null;
    const passoVencido = pendentes.filter((t) => t.previstoPara < agora).sort((a, b) => a.previstoPara - b.previstoPara)[0] ?? null;
    const proximaDemo = demosLead.find((d) => d.status === 'agendada' && d.agendadaPara >= agora) ?? null;
    const demoSemDesfecho =
      demosLead.find((d) => d.status === 'agendada' && d.agendadaPara + TOLERANCIA_DESFECHO_MS < agora) ?? null;

    out.push({
      lead,
      vendedorId: ultimaAtrib.vendedorNovoId,
      atribuidoEm,
      recebidoEm: atribuicoes[0].em,
      etapa,
      status,
      fechadoEm,
      motivoPerdaId: status === 'perdido' ? ultimaEtapa.motivoPerdaId ?? null : null,
      etapaPerda: status === 'perdido' ? ultimaEtapa.de : null,
      historico,
      atribuicoes,
      interacoes,
      tarefas: tarefasLead,
      demos: demosLead,
      primeiroContatoEm: contato ? contato.registradoEm : null,
      primeiroContatoMin: contato ? businessMinutesBetween(atribuidoEm, contato.registradoEm, p) : null,
      prazoSla: slaDeadline(atribuidoEm, p.slaPrimeiroContatoMin, p),
      ultimaInteracaoEm: ultima,
      horasSemInteracao: hoursSkippingWeekends(referencia, fimRelogio, p),
      proximoPasso,
      passoVencido,
      proximaDemo,
      demoSemDesfecho,
      atingiu,
      passo,
    });
  }
  return out;
}

/** Alertas de um lead aberto, do mais grave para o menos grave. */
export function alertas(v: LeadView, agora: number, p: Parametros): Alerta[] {
  if (v.status !== 'aberto') return [];
  const tipos: TipoAlerta[] = [];
  if (v.primeiroContatoEm === null) {
    tipos.push(agora >= v.prazoSla ? 'sla_estourado' : 'prazo_correndo');
  }
  if (v.horasSemInteracao >= p.paradoHoras) tipos.push('parado');
  else if (v.horasSemInteracao >= p.atencaoHoras) tipos.push('atencao');
  if (v.demoSemDesfecho) tipos.push('demo_sem_desfecho');
  if (v.passoVencido) tipos.push('passo_vencido');
  if (v.primeiroContatoEm !== null && !v.proximoPasso && !v.proximaDemo && !v.passoVencido) tipos.push('sem_proximo_passo');
  return tipos
    .map((tipo) => ({ tipo, ...ALERTA_INFO[tipo] }))
    .sort((a, b) => a.gravidade - b.gravidade);
}

/** Situação do SLA de 1º contato de um lead. */
export function situacaoSla(v: LeadView, agora: number, p: Parametros): 'no_prazo' | 'fora' | 'correndo' {
  if (v.primeiroContatoMin !== null) return v.primeiroContatoMin <= p.slaPrimeiroContatoMin ? 'no_prazo' : 'fora';
  return agora >= v.prazoSla ? 'fora' : 'correndo';
}

/** Instante em que um lead vira "parado" (para avisar quem vai parar hoje). */
export function horasAteParado(v: LeadView, p: Parametros): number {
  return Math.max(p.paradoHoras - v.horasSemInteracao, 0);
}

