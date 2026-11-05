import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { metasDoMes } from '../data/metrics/indicadores';
import { progresso, valorIndicador } from '../data/metrics/okr';
import { DAY, fmtDate, monthName, startOfQuarter, wall } from '../data/time';
import { usePainel } from '../state/painel';
import { Gauge } from '../ui/charts';
import { Capsule, CardHead, fmtNum, fmtPct, Hero, Hl, Ring } from '../ui/kit';

function fmtValor(v: number | null, unidade: '%' | '') {
  if (v === null) return '—';
  return unidade === '%' ? fmtPct(v) : fmtNum(v);
}

export function Metas() {
  const { ds, views, dsBase, viewsBase, agora, config, vendedores, metas, okrs, nome, iniciais } = usePainel();
  const p = config.params;
  const ids = vendedores.map((v) => v.id);

  const mes = useMemo(() => metasDoMes(views, agora, p, metas, ids), [views, agora, p, metas, ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniTri = startOfQuarter(agora);
  const fimTri = startOfQuarter(iniTri + 100 * DAY);
  const triPct = ((agora - iniTri) / (fimTri - iniTri)) * 100;
  const trimestre = `${Math.floor(wall(agora).getUTCMonth() / 3) + 1}º trimestre de ${wall(agora).getUTCFullYear()}`;

  const krs = useMemo(() => {
    const ctx = { views, ds, p, metas, vendedores: ids };
    const ctxBase = dsBase ? { views: viewsBase, ds: dsBase, p, metas, vendedores: ids } : null;
    return okrs.map((o) => {
      const resultados = o.resultados.map((kr) => {
        const atual = valorIndicador(kr.indicador, ctx);
        const base = ctxBase ? valorIndicador(kr.indicador, ctxBase, true) : null;
        const prog = progresso(kr, base, atual);
        const status = prog === null ? 'sem' : prog >= triPct - 5 ? 'ok' : prog >= triPct - 25 ? 'atras' : 'risco';
        return { kr, atual, base, prog, status };
      });
      const ps = resultados.map((r) => r.prog).filter((x): x is number => x !== null);
      return { o, resultados, media: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null };
    });
  }, [okrs, views, ds, dsBase, viewsBase, p, metas, ids.join(), triPct]); // eslint-disable-line react-hooks/exhaustive-deps

  const STATUS: Record<string, [string, string, string]> = {
    ok: ['No caminho', 'tag', 'fill-text'],
    atras: ['Um pouco atrás', 'tag tag--amber', 'fill-amber'],
    risco: ['Em risco', 'tag tag--red', 'fill-red'],
    sem: ['Sem linha de base', 'tag', 'fill-neutral'],
  };

  const esperadoAteHoje = (meta: number) => (meta * mes.diasPassados) / Math.max(mes.diasTotal, 1);

  return (
    <>
      <section className="row" style={{ gap: 24 }}>
        <div className="stack gap-20" style={{ flex: '3 1 440px', minWidth: 0, justifyContent: 'center' }}>
          <Hero
            eyebrow={`Meta de ${monthName(agora)} · contratos ganhos`}
            title={
              mes.faltam > 0 ? (
                <>
                  Faltam <Hl>{mes.faltam} contratos</Hl> <Capsule /> para a <Ring>meta</Ring> do mês.
                </>
              ) : (
                <>
                  A <Ring>meta</Ring> de {monthName(agora)} <Capsule /> já foi <Hl>batida</Hl>.
                </>
              )
            }
          />
          <div className="grid grid-auto-160">
            <div className="mini">
              <span className="faint" style={{ fontSize: 12 }}>Ganhos até hoje</span>
              <span className="num" style={{ fontSize: 30 }}>
                {mes.ganhos} <span className="faint" style={{ fontSize: 14 }}>de {mes.meta}</span>
              </span>
            </div>
            <div className="mini">
              <span className="faint" style={{ fontSize: 12 }}>Ritmo atual</span>
              <span className="num" style={{ fontSize: 30 }}>
                {fmtNum(mes.ritmoAtual, 1)} <span className="faint" style={{ fontSize: 14 }}>por dia útil</span>
              </span>
            </div>
            <div className="mini" style={{ borderColor: 'rgba(230,35,78,.4)', background: 'rgba(230,35,78,.08)' }}>
              <span className="accent" style={{ fontSize: 12 }}>Ritmo necessário</span>
              <span className="num accent" style={{ fontSize: 30 }}>
                {fmtNum(mes.ritmoNecessario, 1)} <span style={{ fontSize: 14 }}>por dia útil</span>
              </span>
            </div>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
            Restam {fmtNum(mes.diasRestantes, 1)} dias úteis. A venda conta no mês em que o vendedor marca Ganho, depois do contrato assinado e pago. Em {monthName(mes.ini - DAY)} foram {mes.ganhosMesAnterior} contratos.
          </p>
        </div>

        <div className="card card--feature" style={{ flex: '2 1 340px', padding: '24px 26px 22px' }}>
          <div className="grid-bg" />
          <div className="between" style={{ position: 'relative' }}>
            <div className="stack gap-4">
              <span className="muted" style={{ fontSize: 13 }}>Meta</span>
              <span className="num" style={{ fontSize: 24, fontWeight: 600, color: '#FF6B8A' }}>{mes.meta}</span>
            </div>
            <div className="stack gap-4" style={{ textAlign: 'right' }}>
              <span className="muted" style={{ fontSize: 13 }}>Projeção</span>
              <span className="num" style={{ fontSize: 24, fontWeight: 600, color: '#FF6B8A' }}>{mes.projecao}</span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 1, background: 'rgba(255,255,255,.09)', margin: '4px 0' }} />
          <div style={{ position: 'relative' }}>
            <Gauge pct={mes.projecaoPct ?? 0} label={`Projeção de ${fmtPct(mes.projecaoPct)} da meta`} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>
              <div className="big" style={{ fontSize: 'clamp(50px,5vw,66px)' }}>{fmtPct(mes.projecaoPct)}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>da meta no ritmo atual</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card-pad between">
          <CardHead title={`Meta por vendedor · ${monthName(agora)}`} sub="Cada quadrado é um contrato da meta. A marca mostra onde o vendedor deveria estar hoje." />
          <Link to="/configuracoes" className="btn btn--ghost btn--sm">
            Editar metas
          </Link>
        </div>
        <div role="table" aria-label="Meta por vendedor">
          {mes.porVendedor.map((x) => {
            const esperado = esperadoAteHoje(x.meta);
            const status = x.ganhos >= x.meta ? ['Meta batida', 'var(--accent-text)'] : x.ganhos >= esperado + 0.5 ? ['Acima do ritmo', 'var(--accent-text)'] : x.ganhos >= esperado - 0.5 ? ['No ritmo', 'var(--text)'] : x.ganhos === 0 ? ['Sem ganho no mês', 'var(--amber-text)'] : ['Abaixo do ritmo', 'var(--amber-text)'];
            const slots = Math.max(x.meta, x.ganhos);
            return (
              <div role="row" key={x.id} className="trow clickable" style={{ gridTemplateColumns: 'minmax(160px,1.1fr) minmax(220px,2.4fr) 80px minmax(130px,1fr)', gap: 16 }}>
                <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="avatar">{iniciais(x.id)}</span>
                  <span style={{ fontWeight: 500 }}>{nome(x.id)}</span>
                </span>
                <span role="cell" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${slots}, minmax(0,1fr))`, gap: 6 }}>
                  {Array.from({ length: slots }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        height: 14,
                        borderRadius: 5,
                        background: i < x.ganhos ? 'linear-gradient(90deg,#C81640,#FF6B8A)' : 'var(--track)',
                        boxShadow: i < x.ganhos ? '0 0 14px rgba(230,35,78,.5)' : 'none',
                      }}
                    />
                  ))}
                  <span aria-hidden="true" title="Onde deveria estar hoje" style={{ position: 'absolute', top: -4, bottom: -4, left: `calc(${(esperado / slots) * 100}% - 1px)`, width: 2, borderRadius: 1, background: 'var(--text)' }} />
                </span>
                <span role="cell" className="num">
                  <strong>{x.ganhos}</strong> <span className="faint">de {x.meta}</span>
                </span>
                <span role="cell" style={{ fontSize: 13, fontWeight: 500, color: status[1] }}>{status[0]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack gap-16">
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div className="stack gap-6">
            <span className="eyebrow">OKRs · {trimestre}</span>
            <h2 className="h2" style={{ fontSize: 28 }}>Objetivos do trimestre</h2>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {fmtPct(triPct)} do trimestre já passou · linha de base: o CRM em {fmtDate(iniTri)}
          </span>
        </div>
        {krs.map(({ o, resultados, media }) => (
          <div className="card" key={o.id} style={{ gap: 18 }}>
            <div className="between">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  className="num"
                  style={{ width: 44, height: 44, flex: '0 0 44px', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', background: 'radial-gradient(circle at 30% 28%,#FF8AA4 0%,#E6234E 42%,#9C0F31 100%)', boxShadow: '0 0 24px rgba(230,35,78,.5)' }}
                >
                  {o.codigo}
                </span>
                <span className="num" style={{ fontSize: 20, fontWeight: 500 }}>{o.titulo}</span>
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                Progresso médio <strong style={{ color: 'var(--text)' }}>{fmtPct(media)}</strong>
              </span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {resultados.map(({ kr, atual, base, prog, status }) => (
                <div className="mini" key={kr.id} style={{ gap: 12, padding: 16 }}>
                  <div className="between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{kr.nome}</span>
                    <span className={STATUS[status][1]} style={{ flex: '0 0 auto' }}>{STATUS[status][0]}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="big" style={{ fontSize: 30 }}>{fmtValor(atual, kr.unidade)}</span>
                    <span className="faint" style={{ fontSize: 13 }}>alvo {fmtValor(kr.alvo, kr.unidade)}</span>
                  </div>
                  <span className="track" style={{ height: 8, minHeight: 8, maxHeight: 8 }}>
                    <span className={STATUS[status][2]} style={{ width: `${prog ?? 0}%` }} />
                  </span>
                  <div className="between faint" style={{ fontSize: 12 }}>
                    <span>Linha de base {fmtValor(base, kr.unidade)}</span>
                    <span>{prog === null ? '—' : `${fmtPct(prog)} do caminho`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="faint" style={{ margin: 0, fontSize: 12 }}>
          Os alvos são exemplos até a supervisão fechar a linha de base de 30 dias. Eles podem ser editados em Configurações.
        </p>
      </section>
    </>
  );
}
