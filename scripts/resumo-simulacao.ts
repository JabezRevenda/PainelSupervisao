import { FonteSimulada } from '../src/data/source';
import { construirViews } from '../src/data/metrics/estado';
import { carteira, resumoAtendimento, fechamento, funil, metasDoMes, porCanal, efeitoSla, perdas, resumoDemos } from '../src/data/metrics/indicadores';
import { PARAMETROS_PADRAO as p } from '../src/data/params';
import { DAY, startOfMonth } from '../src/data/time';
import { VENDEDORES } from '../src/data/simulator/catalog';

const agora = Date.now();
const f = new FonteSimulada(process.argv[2] ?? 'revenda-mais');
const t0 = performance.now();
const ds = f.agoraSync(agora);
const t1 = performance.now();
const views = construirViews(ds, p);
const t2 = performance.now();
console.log('tempo sim', (t1-t0).toFixed(0), 'ms; views', (t2-t1).toFixed(0), 'ms');
console.log('leads', ds.leads.length, 'views', views.length, 'interacoes', ds.interacoes.length, 'demos', ds.demos.length);
const r30 = resumoAtendimento(views, ds, p, agora - 30*DAY, agora);
console.log('30d', r30);
console.log('carteira', carteira(views, agora, p));
console.log('fechamento 30d', fechamento(views, agora-30*DAY, agora));
console.log('funil 60-30d', funil(views, agora-60*DAY, agora-30*DAY).map(e=>[e.etapa,e.n,e.conversao?.toFixed(0),e.diasMedios?.toFixed(1)]));
console.log('demos 7d', resumoDemos(views, agora, agora-7*DAY, agora));
const metas = Object.fromEntries(VENDEDORES.map(v=>[v.id,5]));
const m = metasDoMes(views, agora, p, metas, VENDEDORES.map(v=>v.id));
console.log('metas', {g:m.ganhos, proj:m.projecao, pct:m.projecaoPct, passados:m.diasPassados.toFixed(2), total:m.diasTotal});
const mesAnt = startOfMonth(startOfMonth(agora)-DAY);
console.log('ganhos outubro', views.filter(v=>v.status==='ganho'&&v.fechadoEm!>=mesAnt&&v.fechadoEm!<startOfMonth(agora)).length);
console.log('efeito sla 60-0', efeitoSla(views, ds, p, agora-60*DAY, agora-20*DAY));
console.log('canais', porCanal(views, ds, p, agora-60*DAY, agora-20*DAY).map(c=>[c.canal,c.leads,c.slaPct?.toFixed(0),c.conversaoPct?.toFixed(0)]));
const pr = perdas(views, agora-30*DAY, agora);
console.log('perdas', pr.total, [...pr.porMotivo.entries()], 'sem interacao', pr.semInteracao.length);
for (const v of VENDEDORES) {
  const r = resumoAtendimento(views, ds, p, agora-30*DAY, agora, v.id);
  const c = carteira(views, agora, p, v.id);
  const fe = fechamento(views, agora-30*DAY, agora, v.id);
  console.log(v.nome.padEnd(9), 'rec', r.recebidos, 'sla', r.slaPct?.toFixed(0), 'med', r.medianaPrimeiroContatoMin?.toFixed(0), 'i/l', r.interacoesPorLead?.toFixed(1), 'crm', r.usoWhatsappCrmPct?.toFixed(0), '| cart', c.abertos, 'par', c.parados, 'at', c.atencao, '| ganhos', fe.ganhos, 'perd', fe.perdidos);
}
