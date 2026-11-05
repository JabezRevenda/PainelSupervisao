import { useMemo, useState } from 'react';
import { carteira, fechamento, mapaAtividade, metasDoMes, resumoAtendimento, resumoDemos } from '../data/metrics/indicadores';
import { DAY, fmtMinutes } from '../data/time';
import { usePainel } from '../state/painel';
import { Bar, Capsule, CardHead, fmtPct, Hero, Hl, Ring, Seg } from '../ui/kit';

type Ordem = 'sla' | 'conv' | 'parados';

const COLS = 'minmax(160px,1.6fr) 74px 70px minmax(130px,1.3fr) 82px 64px 100px 84px 90px 92px';

interface Linha {
  id: string;
  nome: string;
  ini: string;
  rec: number;
  carteira: number;
  parados: number;
  sla: number | null;
  med: number | null;
  porLead: number | null;
  comp: number | null;
  conv: number | null;
  ganhosMes: number;
  meta: number;
  wpp: number | null;
  retro: number | null;
  status: [string, string, string];
}

function statusDe(sla: number | null, parados: number): [string, string, string] {
  if ((sla ?? 0) < 50 || parados >= 2) return ['Precisa de atenção', 'var(--rm-500)', 'var(--accent-text)'];
  if ((sla ?? 0) < 70 || parados > 0) return ['Abaixo do esperado', 'var(--amber)', 'var(--amber-text)'];
  return ['Dentro do processo', 'var(--text)', 'var(--text-3)'];
}

export function Performance() {
  const { ds, views, agora, config, vendedores, metas, iniciais } = usePainel();
  const p = config.params;
  const [ordem, setOrdem] = useState<Ordem>('sla');
  const [sel, setSel] = useState<string | null>(null);

  const { linhas, time, mapa } = useMemo(() => {
    const ini = agora - 30 * DAY;
    const mes = metasDoMes(views, agora, p, metas, vendedores.map((v) => v.id));
    const linhas: Linha[] = vendedores.map((u) => {
      const r = resumoAtendimento(views, ds, p, ini, agora, u.id);
      const c = carteira(views, agora, p, u.id);
      const f = fechamento(views, ini, agora, u.id);
      const d = resumoDemos(views, agora, ini, agora, u.id);
      return {
        id: u.id,
        nome: u.nome,
        ini: iniciais(u.id),
        rec: r.recebidos,
        carteira: c.abertos,
        parados: c.parados,
        sla: r.slaPct,
        med: r.medianaPrimeiroContatoMin,
        porLead: r.interacoesPorLead,
        comp: d.comparecimentoPct,
        conv: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null,
        ganhosMes: mes.porVendedor.find((x) => x.id === u.id)?.ganhos ?? 0,
        meta: metas[u.id] ?? 0,
        wpp: r.usoWhatsappCrmPct,
        retro: r.retroativosPct,
        status: statusDe(r.slaPct, c.parados),
      };
    });
    const r = resumoAtendimento(views, ds, p, ini, agora);
    const c = carteira(views, agora, p);
    const f = fechamento(views, ini, agora);
    const d = resumoDemos(views, agora, ini, agora);
    const time = {
      rec: r.recebidos,
      carteira: c.abertos,
      parados: c.parados,
      sla: r.slaPct,
      med: r.medianaPrimeiroContatoMin,
      porLead: r.interacoesPorLead,
      comp: d.comparecimentoPct,
      conv: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null,
      ganhos: mes.ganhos,
      meta: mes.meta,
      wpp: r.usoWhatsappCrmPct,
    };
    const mapa = (id: string) => mapaAtividade(ds.interacoes, id, agora - 28 * DAY, agora);
    return { linhas, time, mapa };
  }, [ds, views, agora, p, vendedores, metas, iniciais]);

  const ordenadas = [...linhas].sort((a, b) =>
    ordem === 'conv' ? (b.conv ?? 0) - (a.conv ?? 0) : ordem === 'parados' ? b.parados - a.parados || (a.sla ?? 0) - (b.sla ?? 0) : (b.sla ?? 0) - (a.sla ?? 0),
  );
  const pior = [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))[0];
  const selId = sel ?? pior?.id;
  const det = linhas.find((l) => l.id === selId)!;
  const m = mapa(det.id);
  const maxM = Math.max(1, ...m.flat());
  const totalM = m.flat().reduce((a, b) => a + b, 0);
  const tarde = m.reduce((s, dia) => s + dia[8] + dia[9], 0);
  const tardePct = totalM ? (tarde / totalM) * 100 : 0;

  const criticos = linhas.filter((l) => (l.sla ?? 0) < 50);
  const paradosCriticos = criticos.reduce((s, l) => s + l.parados, 0);
  const convCriticos = criticos.length ? criticos.reduce((s, l) => s + (l.conv ?? 0), 0) / criticos.length : null;

  let insight: string;
  if (tardePct >= 35) insight = `${fmtPct(tardePct)} das interações são registradas depois das 16h, em bloco. Na prática, os leads da manhã esperam o dia todo pelo contato.`;
  else if ((det.retro ?? 0) >= 15) insight = `${fmtPct(det.retro)} das interações são registradas mais de 15 minutos depois do ocorrido. O contato acontece, mas o CRM fica para depois.`;
  else if ((det.wpp ?? 0) < 10) insight = `Quase não usa o WhatsApp do CRM (${fmtPct(det.wpp)}): cada mensagem precisa ser registrada à mão.`;
  else if (det.parados > 0) insight = `Bom ritmo de registros, mas ${det.parados} ${det.parados === 1 ? 'lead está parado' : 'leads estão parados'} há mais de ${p.paradoHoras}h.`;
  else insight = 'Registra ao longo do dia, logo depois de cada contato. É o padrão que o time deveria seguir.';

  // gráfico processo × resultado
  const xs = linhas.map((l) => l.sla ?? 0);
  const ys = linhas.map((l) => l.conv ?? 0);
  const x0 = Math.max(0, Math.floor((Math.min(...xs) - 8) / 10) * 10);
  const x1 = Math.min(100, Math.ceil((Math.max(...xs) + 8) / 10) * 10);
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - 4));
  const y1 = Math.ceil(Math.max(...ys) + 4);
  const px = (v: number) => ((v - x0) / (x1 - x0)) * 100;
  const py = (v: number) => ((v - y0) / (y1 - y0)) * 100;
  const mx = time.sla ?? 0;
  const my = time.conv ?? 0;
  // pontos muito próximos ganham um pequeno deslocamento horizontal para não se esconderem
  const pontos: { l: Linha; dx: number }[] = [];
  for (const l of [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))) {
    const perto = pontos.filter((q) => Math.abs(px(q.l.sla ?? 0) - px(l.sla ?? 0)) < 6 && Math.abs(py(q.l.conv ?? 0) - py(l.conv ?? 0)) < 9);
    pontos.push({ l, dx: perto.length ? Math.max(...perto.map((q) => q.dx)) + 30 : 0 });
  }

  return (
    <>
      <Hero
        eyebrow="Performance · últimos 30 dias"
        title={
          <>
            Quem segue o <Hl>processo</Hl> <Capsule /> e quem <Ring>converte</Ring>.
          </>
        }
        text={
          criticos.length > 0 ? (
            <>
              {criticos.length === 1 ? '1 vendedor tem' : `${criticos.length} vendedores têm`} menos de 50% de primeiro contato em até 1 hora. Juntos, somam {paradosCriticos} dos {time.parados} leads parados e convertem{' '}
              {fmtPct(convCriticos)}, contra {fmtPct(time.conv)} do time. Clique em um vendedor para ver o detalhe.
            </>
          ) : (
            'Todos os vendedores estão acima de 50% de primeiro contato em até 1 hora. Clique em um vendedor para ver o detalhe.'
          )
        }
      />

      <section className="card card--flush">
        <div className="card-pad between">
          <h2 className="h2">Inside Sales · {linhas.length} vendedores</h2>
          <Seg label="Ordenar por" value={ordem} onChange={setOrdem} options={[['sla', 'SLA'], ['conv', 'Conversão'], ['parados', 'Parados']]} />
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 1060 }}>
            <div className="trow thead" style={{ gridTemplateColumns: COLS }}>
              <span>Vendedor</span>
              <span>Recebidos</span>
              <span>Carteira</span>
              <span>1º contato em 1h</span>
              <span>Mediana</span>
              <span>Parados</span>
              <span title="Comparecimento às demos">Comparec.</span>
              <span>Conversão</span>
              <span>Ganhos no mês</span>
              <span>WhatsApp do CRM</span>
            </div>
            {ordenadas.map((l) => {
              const baixo = (l.sla ?? 0) < 50;
              const medio = (l.sla ?? 0) < 70;
              return (
                <button
                  key={l.id}
                  type="button"
                  className={`trow${l.id === selId ? ' selected' : ''}`}
                  style={{ gridTemplateColumns: COLS }}
                  aria-pressed={l.id === selId}
                  onClick={() => setSel(l.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span className="avatar" style={{ width: 32, height: 32, flexBasis: 32 }}>
                      {l.ini}
                      <span className="status" style={{ background: l.status[1] }} />
                    </span>
                    <span className="stack gap-4">
                      <span style={{ fontWeight: 500 }}>{l.nome}</span>
                      <span style={{ fontSize: 11, color: l.status[2] }}>{l.status[0]}</span>
                    </span>
                  </span>
                  <span className="num">{l.rec}</span>
                  <span className="num">{l.carteira}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bar pct={l.sla} tone={baixo ? 'red' : medio ? 'amber' : 'text'} />
                    <span className="num" style={{ width: 40, textAlign: 'right', color: baixo ? 'var(--accent-text)' : medio ? 'var(--amber-text)' : undefined }}>
                      {fmtPct(l.sla)}
                    </span>
                  </span>
                  <span className="mono" style={{ fontSize: 13, color: baixo ? 'var(--accent-text)' : undefined }}>{l.med !== null ? fmtMinutes(l.med) : '—'}</span>
                  <span className="num" style={{ fontWeight: 600, color: l.parados >= 2 ? 'var(--accent-text)' : l.parados === 1 ? 'var(--amber-text)' : 'var(--text-3)' }}>{l.parados}</span>
                  <span className="num">{fmtPct(l.comp)}</span>
                  <span className="num" style={{ fontWeight: 600 }}>{fmtPct(l.conv)}</span>
                  <span className="num">
                    {l.ganhosMes} <span className="faint">/ {l.meta}</span>
                  </span>
                  <span className="num" style={{ color: (l.wpp ?? 0) < 10 ? 'var(--accent-text)' : undefined }}>{fmtPct(l.wpp)}</span>
                </button>
              );
            })}
            <div className="trow total" style={{ gridTemplateColumns: COLS }}>
              <span>Time</span>
              <span className="num">{time.rec}</span>
              <span className="num">{time.carteira}</span>
              <span className="num accent">{fmtPct(time.sla)}</span>
              <span className="mono" style={{ fontSize: 13 }}>{time.med !== null ? fmtMinutes(time.med) : '—'}</span>
              <span className="num accent">{time.parados}</span>
              <span className="num">{fmtPct(time.comp)}</span>
              <span className="num">{fmtPct(time.conv)}</span>
              <span className="num">
                {time.ganhos} <span className="faint">/ {time.meta}</span>
              </span>
              <span className="num">{fmtPct(time.wpp)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="row">
        <div
          className="card"
          style={{
            flex: '1 1 440px',
            ...((det.sla ?? 0) < 50 ? { borderColor: 'rgba(230,35,78,.45)', background: 'radial-gradient(120% 80% at 100% 0%, rgba(230,35,78,.18), transparent 60%), var(--panel)' } : {}),
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="avatar" style={{ width: 52, height: 52, flexBasis: 52, fontSize: 16, borderWidth: 2, borderColor: det.status[1], boxShadow: (det.sla ?? 0) < 50 ? '0 0 22px rgba(230,35,78,.5)' : 'none' }}>
              {det.ini}
            </span>
            <div className="stack gap-4">
              <span className="num" style={{ fontSize: 24, fontWeight: 500 }}>{det.nome}</span>
              <span style={{ fontSize: 13, color: det.status[2] }}>{det.status[0]}</span>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
            {[
              ['1º contato em até 1h', fmtPct(det.sla), `time: ${fmtPct(time.sla)}`, (det.sla ?? 0) < 50 ? 'var(--accent-text)' : undefined],
              ['Mediana até o 1º contato', det.med !== null ? fmtMinutes(det.med) : '—', `time: ${time.med !== null ? fmtMinutes(time.med) : '—'}`, (det.sla ?? 0) < 50 ? 'var(--accent-text)' : undefined],
              ['Parados agora', String(det.parados), `carteira de ${det.carteira} leads`, det.parados >= 2 ? 'var(--accent-text)' : undefined],
              ['Uso do WhatsApp do CRM', fmtPct(det.wpp), `time: ${fmtPct(time.wpp)}`, (det.wpp ?? 0) < 10 ? 'var(--accent-text)' : undefined],
            ].map(([rot, val, sub, cor]) => (
              <div className="mini" key={rot}>
                <span className="faint" style={{ fontSize: 12 }}>{rot}</span>
                <span className="num" style={{ fontSize: 26, color: cor }}>{val}</span>
                <span className="faint" style={{ fontSize: 12 }}>{sub}</span>
              </div>
            ))}
          </div>
          <div className="stack gap-10">
            <div className="between">
              <span style={{ fontWeight: 600 }}>Interações registradas por hora · 4 semanas</span>
              <span className="faint" style={{ fontSize: 12 }}>mais escuro = menos</span>
            </div>
            <div role="img" aria-label={`Mapa de interações de ${det.nome} por dia e hora`} style={{ display: 'grid', gridTemplateColumns: '36px repeat(10, minmax(0,1fr))', gap: 4, alignItems: 'center' }}>
              <span />
              {Array.from({ length: 10 }, (_, h) => (
                <span key={h} className="faint" style={{ fontSize: 10.5, textAlign: 'center' }}>{8 + h}h</span>
              ))}
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((dia, di) => (
                <div key={dia} style={{ display: 'contents' }}>
                  <span className="muted" style={{ fontSize: 12 }}>{dia}</span>
                  {m[di].map((n, h) => {
                    const a = n / maxM;
                    return (
                      <span
                        key={h}
                        title={`${dia} ${8 + h}h: ${n} interações`}
                        style={{ height: 26, borderRadius: 6, background: n === 0 ? 'var(--track)' : `rgba(230,35,78,${(0.15 + a * 0.85).toFixed(2)})`, boxShadow: a > 0.75 ? '0 0 12px rgba(230,35,78,.5)' : 'none' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{insight}</p>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 440px' }}>
          <CardHead title="Processo × resultado" sub="Horizontal: 1º contato em até 1h. Vertical: conversão em ganho (30 dias). Linhas na média do time." />
          <div style={{ position: 'relative', height: 340, margin: '4px 0 26px 30px', borderLeft: '1px solid var(--line-2)', borderBottom: '1px solid var(--line-2)' }}>
            <div aria-hidden="true" style={{ position: 'absolute', left: `${px(mx)}%`, top: 0, bottom: 0, borderLeft: '1px dashed var(--line-2)' }} />
            <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: `${py(my)}%`, borderTop: '1px dashed var(--line-2)' }} />
            <div aria-hidden="true" style={{ position: 'absolute', left: `${px(mx)}%`, right: 0, top: 0, bottom: `${py(my)}%`, background: 'radial-gradient(100% 100% at 100% 0%, rgba(230,35,78,.14), transparent 70%)' }} />
            
            {pontos.map(({ l, dx }) => {
              const on = l.id === selId;
              const bom = (l.sla ?? 0) >= mx && (l.conv ?? 0) >= my;
              const ruim = (l.sla ?? 0) < mx && (l.conv ?? 0) < my;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSel(l.id)}
                  aria-label={`${l.nome}: ${fmtPct(l.sla)} no prazo, ${fmtPct(l.conv)} de conversão`}
                  style={{
                    position: 'absolute',
                    left: `calc(${px(l.sla ?? 0)}% - 17px + ${dx}px)`,
                    bottom: `calc(${py(l.conv ?? 0)}% - 17px)`,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: on ? 2 : 1,
                    color: on ? '#fff' : 'var(--text)',
                    background: on ? 'var(--rm-500)' : bom ? 'rgba(230,35,78,.2)' : ruim ? 'var(--amber-soft)' : 'var(--panel-solid)',
                    border: `1.5px solid ${on ? '#fff' : bom ? 'rgba(230,35,78,.7)' : ruim ? 'var(--amber)' : 'var(--line-2)'}`,
                    boxShadow: on ? '0 0 24px rgba(230,35,78,.9)' : 'none',
                  }}
                >
                  {l.ini}
                </button>
              );
            })}
            <span className="faint" style={{ position: 'absolute', left: -30, top: -6, fontSize: 11 }}>{y1}%</span>
            <span className="faint" style={{ position: 'absolute', left: -26, bottom: -6, fontSize: 11 }}>{y0}%</span>
            <span className="faint" style={{ position: 'absolute', left: -2, bottom: -22, fontSize: 11 }}>{x0}%</span>
            <span className="faint" style={{ position: 'absolute', right: -2, bottom: -22, fontSize: 11 }}>{x1}%</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }} aria-label="Quadrantes">
            {[
              ['Converte sem processo', 'var(--panel-solid)', 'var(--line-2)'],
              ['Processo e resultado', 'rgba(230,35,78,.2)', 'rgba(230,35,78,.7)'],
              ['Precisa de atenção', 'var(--amber-soft)', 'var(--amber)'],
              ['Processo sem resultado', 'var(--panel-solid)', 'var(--line-2)'],
            ].map(([rot, bg, bd]) => (
              <span key={rot} className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--panel-2)' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: bg, border: `1.5px solid ${bd}`, flex: '0 0 12px' }} />
                {rot}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
