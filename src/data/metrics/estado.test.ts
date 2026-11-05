import { describe, expect, it } from 'vitest';
import { PARAMETROS_PADRAO as p } from '../params';
import { simular } from '../simulator';
import { fromWall, MIN } from '../time';
import type { Dataset } from '../types';
import { alertas, construirViews, situacaoSla } from './estado';
import { metasDoMes } from './indicadores';

const t = (d: number, h: number, m = 0) => fromWall(2026, 10, d, h, m); // novembro de 2026

function base(agora: number): Dataset {
  return {
    agora,
    usuarios: [{ id: 'v1', nome: 'Vendedor', funcao: 'vendedor', equipe: 'inside_sales', ativo: true }],
    leads: [{ id: 'L1', criadoEm: t(5, 9), revenda: 'Revenda Teste', cidade: 'Curitiba', uf: 'PR', canal: 'site', utmSource: 'site', utmMedium: 'organic', utmCampaign: null }],
    atribuicoes: [{ id: 'a1', leadId: 'L1', vendedorAnteriorId: null, vendedorNovoId: 'v1', atribuidoPorId: 'sdr', em: t(5, 10) }],
    etapas: [{ id: 'e1', leadId: 'L1', de: null, para: 'demo_agendada', em: t(5, 10), usuarioId: 'sdr' }],
    interacoes: [],
    tarefas: [],
    demos: [],
    motivos: [],
  };
}

describe('SLA de primeiro contato', () => {
  it('sem interação, o prazo corre e depois estoura', () => {
    const correndo = base(t(5, 10, 40));
    expect(alertas(construirViews(correndo, p)[0], correndo.agora, p)[0].tipo).toBe('prazo_correndo');
    const estourado = base(t(5, 11, 5));
    expect(alertas(construirViews(estourado, p)[0], estourado.agora, p)[0].tipo).toBe('sla_estourado');
  });

  it('usa o horário do servidor (registradoEm), não o informado', () => {
    const ds = base(t(5, 15));
    ds.interacoes.push({ id: 'i1', leadId: 'L1', usuarioId: 'v1', tipo: 'whatsapp_enviado', via: 'manual', ocorridoEm: t(5, 10, 20), registradoEm: t(5, 11, 30) });
    const v = construirViews(ds, p)[0];
    expect(v.primeiroContatoMin).toBe(90);
    expect(situacaoSla(v, ds.agora, p)).toBe('fora');
  });

  it('a troca de vendedor reinicia o prazo de 1 hora', () => {
    const ds = base(t(5, 12, 20));
    ds.atribuicoes.push({ id: 'a2', leadId: 'L1', vendedorAnteriorId: 'v1', vendedorNovoId: 'v2', atribuidoPorId: 'sdr', em: t(5, 12) });
    const v = construirViews(ds, p)[0];
    expect(v.vendedorId).toBe('v2');
    expect(v.prazoSla).toBe(t(5, 13));
    expect(alertas(v, ds.agora, p)[0].tipo).toBe('prazo_correndo');
  });
});

describe('lead parado e em atenção', () => {
  it('fica em atenção após 24h e parado após 48h sem interação', () => {
    const ds = base(t(6, 12));
    ds.interacoes.push({ id: 'i1', leadId: 'L1', usuarioId: 'v1', tipo: 'whatsapp_enviado', via: 'whatsapp_crm', ocorridoEm: t(5, 10, 10), registradoEm: t(5, 10, 10) });
    expect(alertas(construirViews(ds, p)[0], ds.agora, p).map((a) => a.tipo)).toContain('atencao');
    // quinta 10h10 → segunda 10h10 = 48h sem contar sábado e domingo
    const ds2 = { ...ds, agora: t(9, 10, 15) };
    expect(alertas(construirViews(ds2, p)[0], ds2.agora, p).map((a) => a.tipo)).toContain('parado');
  });
});

describe('metas do mês', () => {
  it('conta ganhos pela data em que o vendedor marca Ganho', () => {
    const ds = base(t(20, 12));
    ds.etapas.push({ id: 'e2', leadId: 'L1', de: 'negociacao', para: 'ganho', em: t(19, 15), usuarioId: 'v1' });
    const m = metasDoMes(construirViews(ds, p), ds.agora, p, { v1: 5 }, ['v1']);
    expect(m.ganhos).toBe(1);
    expect(m.meta).toBe(5);
  });
});

describe('simulador', () => {
  it('é determinístico: a mesma semente gera os mesmos dados', () => {
    const agora = t(5, 16);
    const a = simular('teste', agora);
    const b = simular('teste', agora);
    expect(a.leads.length).toBe(b.leads.length);
    expect(a.interacoes.length).toBe(b.interacoes.length);
    expect(a.leads[10]).toEqual(b.leads[10]);
  });

  it('gera um volume parecido com o real (cerca de 200 leads por mês)', () => {
    const plano = simular('revenda-mais', t(5, 16));
    const mes = plano.atribuicoes.filter((x) => x.vendedorAnteriorId === null && x.em > t(5, 16) - 30 * 24 * 60 * MIN);
    expect(mes.length).toBeGreaterThan(150);
    expect(mes.length).toBeLessThan(260);
  });
});
