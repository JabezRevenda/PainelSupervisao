import { useMemo, useState } from 'react';
import { perdas, resumoAtendimento } from '../data/metrics/indicadores';
import { DAY, fmtDate } from '../data/time';
import { ETAPA_LABEL, type Etapa } from '../data/types';
import { usePainel } from '../state/painel';
import { Bar, Capsule, CardHead, fmtPct, Hero, Hl, Ring, Seg } from '../ui/kit';

type Janela = '30' | '60' | '90';
const ETAPAS_PERDA: Etapa[] = ['demo_agendada', 'demo_realizada', 'proposta_enviada', 'negociacao'];

export function Perdas() {
  const { ds, views, agora, config, nome, abrirLead } = usePainel();
  const [janela, setJanela] = useState<Janela>('30');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const r = perdas(views, ini, agora);
    const lentos = new Set(
      [...r.porVendedor.keys()].filter((id) => (resumoAtendimento(views, ds, config.params, ini, agora, id).slaPct ?? 100) < 50),
    );
    return { ini, r, lentos };
  }, [views, ds, agora, dias, config.params]);

  const { ini, r, lentos } = d;
  const motivoNome = (id: string) => ds.motivos.find((m) => m.id === id)?.nome ?? 'Sem motivo';
  const motivos = [...r.porMotivo.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m[1]));
  const semRetorno = r.porMotivo.get('sem_retorno') ?? 0;
  let semRetornoLentos = 0;
  for (const [id, pv] of r.porVendedor) if (lentos.has(id)) semRetornoLentos += pv.motivos.get('sem_retorno') ?? 0;
  const porEtapa = ETAPAS_PERDA.map((e) => ({ e, n: r.porEtapa.get(e) ?? 0 }));
  const maxEtapa = Math.max(1, ...porEtapa.map((x) => x.n));
  const antesDaDemo = r.porEtapa.get('demo_agendada') ?? 0;
  const naoCompareceu = r.porMotivo.get('nao_compareceu') ?? 0;
  const porVend = [...r.porVendedor.entries()].map(([id, pv]) => ({ id, n: pv.n, motivo: [...pv.motivos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] })).sort((a, b) => b.n - a.n);
  const maxVend = Math.max(1, ...porVend.map((x) => x.n));
  const semInterPorVend = new Map<string, number>();
  for (const v of r.semInteracao) semInterPorVend.set(v.vendedorId, (semInterPorVend.get(v.vendedorId) ?? 0) + 1);

  return (
    <>
      <div className="between">
        <span className="chip">
          Perdas marcadas de {fmtDate(ini)} a {fmtDate(agora)}
        </span>
        <Seg label="Janela de análise" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />
      </div>

      <Hero
        eyebrow={`Perdas · últimos ${dias} dias`}
        title={
          <>
            Perdemos <Ring>{r.total}</Ring> negociações. <Hl>{r.semInteracao.length === 1 ? '1 delas' : `${r.semInteracao.length} delas`}</Hl> <Capsule /> nunca {r.semInteracao.length === 1 ? 'teve' : 'tiveram'} uma interação.
          </>
        }
        text={
          <>
            O motivo vem da lista obrigatória do CRM. "Sem retorno do cliente" soma {semRetorno} perdas
            {semRetornoLentos > 0 ? `, ${semRetornoLentos} delas de vendedores com menos de 50% de primeiro contato em até 1 hora` : ''}.
          </>
        }
      />

      <section className="row">
        <div className="card" style={{ flex: '2 1 520px' }}>
          <CardHead title="Motivos de perda" sub={`${r.total} negociações perdidas`} />
          <div className="stack gap-16">
            {motivos.map(([id, n]) => {
              const destaque = id === 'sem_retorno';
              return (
                <div key={id} className="stack gap-8">
                  <div className="between" style={{ fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{motivoNome(id)}</span>
                    <span className="muted">
                      <strong className="num" style={{ color: 'var(--text)' }}>{n}</strong> · {fmtPct((n / r.total) * 100)}
                    </span>
                  </div>
                  <span className="track" style={{ height: 12, minHeight: 12, maxHeight: 12, borderRadius: 6 }}>
                    <span
                      style={{
                        width: `${(n / maxMotivo) * 100}%`,
                        borderRadius: 6,
                        background: destaque ? 'linear-gradient(90deg,#9C0F31,#F04A6E)' : 'rgba(230,35,78,.45)',
                        boxShadow: destaque ? '0 0 18px rgba(230,35,78,.7)' : 'none',
                      }}
                    />
                  </span>
                  {destaque && semRetornoLentos > 0 && (
                    <span className="amber" style={{ fontSize: 12 }}>
                      {semRetornoLentos} de {semRetorno} são de vendedores lentos no primeiro contato.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card--pink" style={{ flex: '1 1 300px' }}>
          <span className="eyebrow">Perdas sem nenhuma interação</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="big" style={{ fontSize: 64 }}>{r.semInteracao.length}</span>
            <span style={{ fontSize: 14 }}>marcadas como perdidas sem nenhum contato registrado</span>
          </div>
          <div className="stack gap-8">
            {[...semInterPorVend.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => (
              <div key={id} className="between" style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(12,11,14,.82)', fontSize: 14 }}>
                <span>{nome(id)}</span>
                <strong className="num">{n}</strong>
              </div>
            ))}
            {r.semInteracao.slice(0, 3).map((v) => (
              <button key={v.lead.id} type="button" onClick={() => abrirLead(v.lead.id)} style={{ textAlign: 'left', border: 0, background: 'transparent', color: '#fff', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                Ver {v.lead.revenda}
              </button>
            ))}
          </div>
          <p style={{ margin: 'auto 0 0', fontSize: 13, lineHeight: 1.5 }}>Com a trava da Fase 1, o CRM não deixa marcar Perdido sem ao menos uma interação.</p>
        </div>
      </section>

      <section className="row">
        <div className="card card--feature" style={{ flex: '1 1 380px' }}>
          <CardHead title="Em que etapa perdemos" sub="Etapa em que o lead estava quando foi marcado como perdido" />
          <div role="img" aria-label={`Perdas por etapa: ${porEtapa.map((x) => `${ETAPA_LABEL[x.e]} ${x.n}`).join(', ')}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 220, borderBottom: '1px solid rgba(255,255,255,.14)' }}>
            {porEtapa.map((x, i) => (
              <div key={x.e} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, height: '100%' }}>
                <span className="num" style={{ fontSize: 18, fontWeight: 600 }}>{x.n}</span>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 72,
                    height: (x.n / maxEtapa) * 170,
                    borderRadius: '12px 12px 4px 4px',
                    background: i === 0 ? 'linear-gradient(180deg,#FF6B8A,#C81640)' : `linear-gradient(180deg, rgba(255,107,138,${0.8 - i * 0.12}), rgba(200,22,64,${0.8 - i * 0.12}))`,
                    boxShadow: x.n === maxEtapa ? '0 0 26px rgba(230,35,78,.55)' : 'none',
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: -8 }} aria-hidden="true">
            {porEtapa.map((x) => (
              <span key={x.e} className="muted" style={{ flex: '1 1 0', textAlign: 'center', fontSize: 12 }}>{ETAPA_LABEL[x.e]}</span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
            {fmtPct(r.total ? (antesDaDemo / r.total) * 100 : null)} das perdas acontecem antes da demo; {naoCompareceu} por não comparecimento sem remarcação.
          </p>
        </div>

        <div className="card card--flush" style={{ flex: '1 1 440px' }}>
          <div className="card-pad">
            <CardHead title="Perdas por vendedor" sub="Quantidade e motivo mais comum" />
          </div>
          <div role="table" aria-label="Perdas por vendedor">
            {porVend.map((x) => (
              <div role="row" key={x.id} className="trow clickable" style={{ gridTemplateColumns: 'minmax(120px,1fr) minmax(110px,1.2fr) minmax(160px,1.4fr)' }}>
                <span role="cell" style={{ fontWeight: 500 }}>{nome(x.id)}</span>
                <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bar pct={(x.n / maxVend) * 100} tone={x.n >= maxVend * 0.75 ? 'red' : 'neutral'} />
                  <span className="num" style={{ width: 24, textAlign: 'right', fontWeight: 600 }}>{x.n}</span>
                </span>
                <span role="cell" className="muted" style={{ fontSize: 13 }}>{x.motivo ? motivoNome(x.motivo) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
