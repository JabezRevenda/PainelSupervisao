import { DAY, startOfMonth } from '../time';
import type { Dataset, IndicadorOkr, Parametros, ResultadoChave } from '../types';
import type { LeadView } from './estado';
import { carteira, metasDoMes, perdas, resumoAtendimento } from './indicadores';

export interface Contexto {
  views: LeadView[];
  ds: Dataset;
  p: Parametros;
  metas: Record<string, number>;
  vendedores: string[];
}

export function valorIndicador(ind: IndicadorOkr, c: Contexto, linhaDeBase = false): number | null {
  const { views, ds, p } = c;
  const agora = ds.agora;
  switch (ind) {
    case 'sla_1h':
      return resumoAtendimento(views, ds, p, agora - 30 * DAY, agora).slaPct;
    case 'parados_agora':
      return carteira(views, agora, p).parados;
    case 'com_proximo_passo':
      return carteira(views, agora, p).comProximoPassoPct;
    case 'contratos_mes': {
      if (linhaDeBase) {
        // linha de base: contratos ganhos no mês anterior ao início do trimestre
        const ini = startOfMonth(agora - DAY);
        return views.filter((v) => v.status === 'ganho' && v.fechadoEm! >= ini && v.fechadoEm! < agora).length;
      }
      const m = metasDoMes(views, agora, p, c.metas, c.vendedores);
      return m.projecao;
    }
    case 'uso_whatsapp_crm':
      return resumoAtendimento(views, ds, p, agora - 30 * DAY, agora).usoWhatsappCrmPct;
    case 'perdas_sem_interacao':
      return perdas(views, agora - 30 * DAY, agora).semInteracao.length;
  }
}

/** Fração do caminho entre a linha de base e o alvo (0 a 100). */
export function progresso(kr: ResultadoChave, base: number | null, atual: number | null): number | null {
  if (base === null || atual === null) return null;
  const total = kr.menorMelhor ? base - kr.alvo : kr.alvo - base;
  if (total <= 0) return atual === kr.alvo || (kr.menorMelhor ? atual <= kr.alvo : atual >= kr.alvo) ? 100 : 0;
  const feito = kr.menorMelhor ? base - atual : atual - base;
  return Math.max(0, Math.min(100, (feito / total) * 100));
}
