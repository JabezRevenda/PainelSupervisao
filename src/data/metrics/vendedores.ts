import { DAY } from '../time';
import type { Dataset, Parametros, Usuario } from '../types';
import type { LeadView } from './estado';
import { carteira, fechamento, metasDoMes, resumoAtendimento, resumoDemos } from './indicadores';

export type StatusVendedor = 'atencao' | 'abaixo' | 'ok';

export const STATUS_VENDEDOR: Record<StatusVendedor, { rotulo: string; cor: string }> = {
  atencao: { rotulo: 'Precisa de atenção', cor: 'var(--primary)' },
  abaixo: { rotulo: 'Abaixo do esperado', cor: 'var(--warning)' },
  ok: { rotulo: 'No processo', cor: 'var(--success)' },
};

/** Regra única de status: menos de 50% no prazo ou 2+ parados = atenção; menos de 70% ou 1 parado = abaixo. */
export function statusVendedor(sla: number | null, parados: number): StatusVendedor {
  if ((sla ?? 0) < 50 || parados >= 2) return 'atencao';
  if ((sla ?? 0) < 70 || parados > 0) return 'abaixo';
  return 'ok';
}

export interface LinhaVendedor {
  id: string;
  nome: string;
  recebidos: number;
  carteira: number;
  semContato: number;
  parados: number;
  atencao: number;
  sla: number | null;
  medianaMin: number | null;
  comparecimento: number | null;
  conversao: number | null;
  ganhosMes: number;
  meta: number;
  whatsapp: number | null;
  retroativos: number | null;
  status: StatusVendedor;
}

/** Indicadores de cada vendedor nos últimos 30 dias, mais a carteira de agora. */
export function linhasVendedores(views: LeadView[], ds: Dataset, p: Parametros, agora: number, vendedores: Usuario[], metas: Record<string, number>): LinhaVendedor[] {
  const ini = agora - 30 * DAY;
  const mes = metasDoMes(
    views,
    agora,
    p,
    metas,
    vendedores.map((v) => v.id),
  );
  return vendedores.map((u) => {
    const r = resumoAtendimento(views, ds, p, ini, agora, u.id);
    const c = carteira(views, agora, p, u.id);
    const f = fechamento(views, ini, agora, u.id);
    const dm = resumoDemos(views, agora, ini, agora, u.id);
    return {
      id: u.id,
      nome: u.nome,
      recebidos: r.recebidos,
      carteira: c.abertos,
      semContato: c.semContato,
      parados: c.parados,
      atencao: c.atencao,
      sla: r.slaPct,
      medianaMin: r.medianaPrimeiroContatoMin,
      comparecimento: dm.comparecimentoPct,
      conversao: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null,
      ganhosMes: mes.porVendedor.find((x) => x.id === u.id)?.ganhos ?? 0,
      meta: metas[u.id] ?? 0,
      whatsapp: r.usoWhatsappCrmPct,
      retroativos: r.retroativosPct,
      status: statusVendedor(r.slaPct, c.parados),
    };
  });
}
