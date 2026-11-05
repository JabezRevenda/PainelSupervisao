/**
 * Simulador do CRM.
 *
 * Gera, de forma determinística (mesma semente = mesmos dados), o ciclo de vida
 * completo de cada lead que chega ao Inside Sales: atribuição pelo SDR, demo
 * agendada, interações registradas, próximos passos, desfecho da demo, mudanças
 * de etapa e ganho ou perda. Os eventos são planejados inteiros e depois
 * "materializados" no instante desejado: só aparece o que já aconteceu.
 * Assim o painel funciona em tempo real sobre a hora atual.
 *
 * Os perfis de comportamento são sorteados entre os vendedores pela semente e
 * NÃO refletem o desempenho real de ninguém.
 */
import { PARAMETROS_PADRAO } from '../params';
import {
  addBusinessMinutes,
  DAY,
  dayKey,
  fromWall,
  HOUR,
  isBusinessDay,
  MIN,
  startOfDay,
  weekday,
} from '../time';
import type {
  Atribuicao,
  Canal,
  Dataset,
  Demo,
  Etapa,
  Interacao,
  Lead,
  MudancaEtapa,
  Tarefa,
  TipoInteracao,
  Usuario,
} from '../types';
import {
  CANAIS_PESO,
  CIDADES,
  MOTIVOS_PERDA,
  N_NOMES,
  N_SUFIXOS,
  nomeRevenda,
  PERFIS,
  type Perfil,
  PRE_VENDAS,
  QUALIDADE_CANAL,
  SUPERVISAO,
  UTM,
  VENDEDORES,
} from './catalog';
import { Rng } from './random';

const P = PARAMETROS_PADRAO; // o simulador agenda sempre no expediente padrão

/** Dias de histórico gerados antes de hoje. */
const DIAS_HISTORICO = 130;

/** A partir desta data o time trabalha no ritmo "atual"; antes, um pouco mais lento. */
const ANCORA_TENDENCIA = fromWall(2026, 9, 1); // 01/10/2026

export interface PlanoSimulado {
  semente: string;
  usuarios: Usuario[];
  perfis: Record<string, Perfil>;
  leads: Lead[];
  atribuicoes: Atribuicao[];
  etapas: MudancaEtapa[];
  interacoes: Interacao[];
  tarefas: Tarefa[];
  demos: Demo[];
}

const PESO_HORA: [number, number][] = [
  [7, 0.3], [8, 0.8], [9, 1.2], [10, 1.4], [11, 1.3], [12, 0.8], [13, 1.0], [14, 1.3],
  [15, 1.3], [16, 1.2], [17, 1.0], [18, 0.7], [19, 0.5], [20, 0.4], [21, 0.2],
];

function tendencia(criadoEm: number) {
  // 0 a partir da âncora; até 1 para leads de ~120 dias antes
  const idade = Math.min(Math.max((ANCORA_TENDENCIA - criadoEm) / (120 * DAY), 0), 1);
  return { lento: 1 + 0.6 * idade, crm: 1 - 0.55 * idade, pula: 1 + 1.2 * idade };
}

export function simular(semente: string, agora: number): PlanoSimulado {
  const perfisRng = new Rng(`${semente}:perfis`);
  const sorteio = perfisRng.shuffle(PERFIS);
  const perfis: Record<string, Perfil> = {};
  VENDEDORES.forEach((v, i) => (perfis[v.id] = sorteio[i]));

  const plano: PlanoSimulado = {
    semente,
    usuarios: [...VENDEDORES, ...PRE_VENDAS, SUPERVISAO],
    perfis,
    leads: [],
    atribuicoes: [],
    etapas: [],
    interacoes: [],
    tarefas: [],
    demos: [],
  };

  const hoje = startOfDay(agora);
  for (let d = hoje - DIAS_HISTORICO * DAY; d <= hoje; d += DAY) {
    const dk = dayKey(d + 12 * HOUR);
    const rng = new Rng(`${semente}:${dk}`);
    const wd = weekday(d + 12 * HOUR);
    const lambda = wd === 0 ? 0.5 : wd === 6 ? 1.1 : 9.6;
    const n = rng.poisson(lambda);
    for (let i = 0; i < n; i++) {
      const lr = new Rng(`${semente}:${dk}:${i}`);
      const hora = wd === 0 || wd === 6 ? lr.int(9, 17) : lr.weighted(PESO_HORA);
      const criadoEm = d + hora * HOUR + lr.int(0, 59) * MIN;
      gerarLead(plano, `L${dk.replace(/-/g, '')}-${String(i + 1).padStart(2, '0')}`, criadoEm, lr);
    }
  }

  plano.leads.sort((a, b) => a.criadoEm - b.criadoEm);
  plano.atribuicoes.sort((a, b) => a.em - b.em);
  plano.etapas.sort((a, b) => a.em - b.em);
  plano.interacoes.sort((a, b) => a.registradoEm - b.registradoEm);
  plano.tarefas.sort((a, b) => a.criadoEm - b.criadoEm);
  plano.demos.sort((a, b) => a.criadoEm - b.criadoEm);
  return plano;
}

function agendarDemo(lr: Rng, apos: number): number {
  const dias = lr.weighted([[1, 0.38], [2, 0.32], [3, 0.18], [4, 0.12]] as const);
  let dia = startOfDay(apos);
  let contados = 0;
  while (contados < dias) {
    dia += DAY;
    if (isBusinessDay(dia, P)) contados++;
  }
  const slot = lr.int(0, 16); // 9:00 a 17:00, de meia em meia hora
  return dia + 9 * HOUR + slot * 30 * MIN;
}

function gerarLead(plano: PlanoSimulado, id: string, criadoEm: number, lr: Rng) {
  const canal: Canal = lr.weighted(CANAIS_PESO);
  const utm = UTM[canal];
  const [cidade, uf] = lr.weighted(CIDADES.map((c) => [[c[0], c[1]], c[2]] as const));
  const lead: Lead = {
    id,
    criadoEm,
    revenda: nomeRevenda(lr.int(0, N_NOMES - 1), lr.int(0, N_SUFIXOS - 1)),
    cidade,
    uf,
    canal,
    utmSource: utm.source,
    utmMedium: utm.medium,
    utmCampaign: lr.weighted(utm.campaigns),
  };
  plano.leads.push(lead);

  const qual = QUALIDADE_CANAL[canal];
  const tend = tendencia(criadoEm);
  const sdr = lr.pick(PRE_VENDAS).id;
  const escolherVendedor = (exceto?: string) =>
    lr.weighted(VENDEDORES.filter((v) => v.id !== exceto).map((v) => [v.id, plano.perfis[v.id].carga] as const));

  let seq = 0;
  const nid = (p: string) => `${id}-${p}${++seq}`;

  // 1. SDR agenda a demo e atribui ao vendedor
  let atribuidoEm = addBusinessMinutes(criadoEm, lr.lognormal(35, 0.9), P);
  let vend = escolherVendedor();
  plano.atribuicoes.push({ id: nid('a'), leadId: id, vendedorAnteriorId: null, vendedorNovoId: vend, atribuidoPorId: sdr, em: atribuidoEm });
  let etapa: Etapa = 'demo_agendada';
  plano.etapas.push({ id: nid('e'), leadId: id, de: null, para: etapa, em: atribuidoEm, usuarioId: sdr });
  let demoEm = agendarDemo(lr, atribuidoEm);
  let demoCriadaEm = atribuidoEm;

  // 1b. Às vezes o SDR troca o vendedor (o prazo de 1 hora recomeça)
  if (lr.chance(0.05)) {
    const t2 = addBusinessMinutes(atribuidoEm, lr.lognormal(70, 0.8), P);
    if (t2 < demoEm - 2 * HOUR) {
      const novo = escolherVendedor(vend);
      plano.atribuicoes.push({ id: nid('a'), leadId: id, vendedorAnteriorId: vend, vendedorNovoId: novo, atribuidoPorId: sdr, em: t2 });
      vend = novo;
      atribuidoEm = t2;
    }
  }
  const perfil = plano.perfis[vend];

  // --- registro de interações e próximos passos ---
  let tarefaAberta: Tarefa | null = null;
  let ultimaInteracao = atribuidoEm;
  let nInteracoes = 0;
  let fechado = false;

  const registrar = (ocorridoEm: number, tipo: TipoInteracao, registradoEm?: number) => {
    let via: Interacao['via'];
    let reg = registradoEm ?? ocorridoEm;
    if (tipo === 'whatsapp_enviado' && lr.chance(perfil.usoWhatsappCrm * tend.crm)) {
      via = 'whatsapp_crm';
    } else {
      via = lr.chance(0.55) ? 'registro_rapido' : 'manual';
      if (registradoEm === undefined) {
        reg = ocorridoEm + (lr.chance(perfil.registroAtrasado) ? lr.int(20, 240) : lr.int(0, 4)) * MIN;
      }
    }
    plano.interacoes.push({ id: nid('i'), leadId: id, usuarioId: vend, tipo, via, ocorridoEm, registradoEm: reg });
    nInteracoes++;
    ultimaInteracao = Math.max(ultimaInteracao, ocorridoEm);
    if (tarefaAberta) {
      tarefaAberta.concluidoEm = reg;
      tarefaAberta = null;
    }
    if (lr.chance(perfil.proximoPasso)) {
      tarefaAberta = {
        id: nid('t'),
        leadId: id,
        usuarioId: vend,
        criadoEm: reg,
        previstoPara: addBusinessMinutes(reg, lr.lognormal(480, 0.6), P),
        concluidoEm: null,
      };
      plano.tarefas.push(tarefaAberta);
    }
  };

  const mudarEtapa = (para: Etapa, em: number, motivoPerdaId?: string) => {
    plano.etapas.push({ id: nid('e'), leadId: id, de: etapa, para, em, usuarioId: vend, motivoPerdaId });
    etapa = para;
    if (para === 'ganho' || para === 'perdido') {
      fechado = true;
      if (tarefaAberta) {
        tarefaAberta.concluidoEm = em;
        tarefaAberta = null;
      }
    }
  };

  /** Acompanhamentos até `ate`, no ritmo do vendedor (com "abandonos" ocasionais). */
  const acompanhar = (ate: number, tipos: [TipoInteracao, number][]) => {
    for (let guard = 0; guard < 30; guard++) {
      let intervalo = lr.lognormal(perfil.intervaloMin * tend.lento, 0.75);
      if (lr.chance(perfil.abandono)) intervalo *= lr.int(3, 7);
      const prox = addBusinessMinutes(ultimaInteracao, intervalo, P);
      if (prox >= ate - 30 * MIN) return;
      registrar(prox, lr.weighted(tipos));
    }
  };

  const perder = (desde: number, medianaMin: number, motivos: [string, number][]) => {
    const em = addBusinessMinutes(desde, lr.lognormal(medianaMin, 0.7), P);
    // lead que nunca teve contato e é encerrado sem nenhuma tentativa registrada
    if (!(nInteracoes === 0 && lr.chance(0.75))) {
      acompanhar(em, [['tentativa_sem_resposta', 0.55], ['whatsapp_enviado', 0.45]]);
    }
    mudarEtapa('perdido', Math.max(em, ultimaInteracao + 10 * MIN), lr.weighted(motivos));
  };

  // 2. Primeiro contato do vendedor
  if (!lr.chance(Math.min(perfil.pulaContato * tend.pula, 0.6))) {
    const primeiro = addBusinessMinutes(atribuidoEm, lr.lognormal(perfil.primeiroContatoMin * tend.lento, perfil.sigma), P);
    if (primeiro < demoEm - 30 * MIN) {
      registrar(primeiro, 'whatsapp_enviado');
      if (lr.chance(0.45)) {
        const resp = addBusinessMinutes(primeiro, lr.lognormal(50, 1), P);
        if (resp < demoEm - 30 * MIN) registrar(resp, 'lead_respondeu');
      }
      acompanhar(demoEm - 3 * HOUR, [['whatsapp_enviado', 0.6], ['lead_respondeu', 0.4]]);
      if (lr.chance(0.5)) {
        const conf = demoEm - lr.int(60, 180) * MIN;
        if (conf > ultimaInteracao) registrar(conf, 'whatsapp_enviado');
      }
    }
  }

  // 3. Demo (com uma remarcação possível)
  for (let tentativa = 0; tentativa < 2 && !fechado; tentativa++) {
    const compareceu = lr.chance(Math.min(perfil.comparecimento * Math.pow(qual, 0.3), 0.97));
    const semDesfechoPorUmTempo = lr.chance(perfil.registroAtrasado * 0.35);
    const desfechoEm = semDesfechoPorUmTempo
      ? addBusinessMinutes(demoEm, lr.lognormal(900, 0.6), P)
      : demoEm + lr.int(35, 80) * MIN;
    plano.demos.push({
      id: nid('d'),
      leadId: id,
      vendedorId: vend,
      criadoEm: demoCriadaEm,
      agendadaPara: demoEm,
      status: compareceu ? 'realizada' : 'nao_compareceu',
      desfechoEm,
    });
    if (compareceu) {
      registrar(demoEm, 'videochamada', desfechoEm);
      mudarEtapa('demo_realizada', desfechoEm);
      break;
    }
    if (tentativa === 0 && lr.chance(0.45)) {
      registrar(addBusinessMinutes(desfechoEm, lr.lognormal(60, 0.8), P), 'whatsapp_enviado');
      demoCriadaEm = ultimaInteracao + 5 * MIN;
      demoEm = agendarDemo(lr, demoCriadaEm);
      continue;
    }
    perder(desfechoEm, 900, [['nao_compareceu', 0.75], ['sem_retorno', 0.25]]);
  }
  if (fechado) return;

  // 4. Proposta
  if (lr.chance(Math.min(perfil.proposta * qual, 0.95))) {
    const em = addBusinessMinutes(ultimaInteracao, lr.lognormal(480, 0.7), P);
    acompanhar(em, [['whatsapp_enviado', 0.6], ['lead_respondeu', 0.4]]);
    registrar(em, lr.chance(0.3) ? 'email' : 'whatsapp_enviado');
    mudarEtapa('proposta_enviada', em + lr.int(1, 10) * MIN);
  } else {
    perder(ultimaInteracao, 1800, [['preco', 0.35], ['sem_retorno', 0.25], ['outro_sistema', 0.25], ['adiou', 0.15]]);
    return;
  }

  // 5. Negociação
  if (lr.chance(Math.min(perfil.negociacao * Math.sqrt(qual), 0.95))) {
    const em = addBusinessMinutes(ultimaInteracao, lr.lognormal(1200, 0.7), P);
    acompanhar(em, [['whatsapp_enviado', 0.5], ['tentativa_sem_resposta', 0.2], ['lead_respondeu', 0.3]]);
    registrar(em, 'lead_respondeu');
    mudarEtapa('negociacao', em + lr.int(1, 20) * MIN);
  } else {
    perder(ultimaInteracao, 2000, [['preco', 0.3], ['sem_retorno', 0.35], ['adiou', 0.2], ['concorrente', 0.15]]);
    return;
  }

  // 6. Ganho (contrato assinado e pago: o vendedor marca no CRM)
  if (lr.chance(Math.min(perfil.ganho * Math.sqrt(qual), 0.95))) {
    const em = addBusinessMinutes(ultimaInteracao, lr.lognormal(1900, 0.7), P);
    acompanhar(em, [['whatsapp_enviado', 0.5], ['lead_respondeu', 0.35], ['email', 0.15]]);
    registrar(em, 'lead_respondeu');
    mudarEtapa('ganho', em + lr.int(5, 90) * MIN);
  } else {
    perder(ultimaInteracao, 2600, [['preco', 0.35], ['concorrente', 0.3], ['adiou', 0.25], ['sem_retorno', 0.1]]);
  }
}

// ---------- materialização: o CRM como estava no instante t ----------

function ate<T>(arr: T[], t: number, key: (x: T) => number): T[] {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(arr[mid]) <= t) lo = mid + 1;
    else hi = mid;
  }
  return arr.slice(0, lo);
}

export function materializar(plano: PlanoSimulado, t: number): Dataset {
  return {
    agora: t,
    usuarios: plano.usuarios,
    motivos: MOTIVOS_PERDA,
    leads: ate(plano.leads, t, (x) => x.criadoEm),
    atribuicoes: ate(plano.atribuicoes, t, (x) => x.em),
    etapas: ate(plano.etapas, t, (x) => x.em),
    interacoes: ate(plano.interacoes, t, (x) => x.registradoEm),
    tarefas: ate(plano.tarefas, t, (x) => x.criadoEm).map((x) =>
      x.concluidoEm !== null && x.concluidoEm > t ? { ...x, concluidoEm: null } : x,
    ),
    demos: ate(plano.demos, t, (x) => x.criadoEm).map((x) =>
      x.desfechoEm === null || x.desfechoEm > t ? { ...x, status: 'agendada' as const, desfechoEm: null } : x,
    ),
  };
}
