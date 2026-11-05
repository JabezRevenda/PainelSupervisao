import { useMemo, useState } from 'react';
import { efeitoSla, porCampanha, porCanal } from '../data/metrics/indicadores';
import { DAY, fmtDate } from '../data/time';
import { CANAL_LABEL } from '../data/types';
import { usePainel } from '../state/painel';
import { Bar, Capsule, CardHead, fmtNum, fmtPct, Hero, Hl, Ring, Seg } from '../ui/kit';

type Janela = '30' | '60' | '90';

export function Marketing() {
  const { ds, views, agora, config } = usePainel();
  const p = config.params;
  const [janela, setJanela] = useState<Janela>('60');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    return {
      ini,
      canais: porCanal(views, ds, p, ini, agora),
      efeito: efeitoSla(views, ds, p, ini, agora),
      campanhas: porCampanha(views, ds, p, ini, agora).slice(0, 7),
    };
  }, [views, ds, p, agora, dias]);

  const { ini, canais, efeito, campanhas } = d;
  const total = efeito.dentro + efeito.fora;
  const comLeads = canais.filter((c) => c.leads >= 10);
  const piorConv = [...comLeads].sort((a, b) => (a.conversaoPct ?? 0) - (b.conversaoPct ?? 0))[0];
  const melhorConv = [...comLeads].sort((a, b) => (b.conversaoPct ?? 0) - (a.conversaoPct ?? 0))[0];
  const maxConv = Math.max(5, ...canais.flatMap((c) => [c.convNoPrazoPct ?? 0, c.convForaPct ?? 0]));
  const avaliaveis = canais.filter((c) => c.noPrazo >= 5 && c.fora >= 5);
  const canaisAvaliados = avaliaveis.length;
  const canaisMelhores = avaliaveis.filter((c) => (c.convNoPrazoPct ?? 0) > (c.convForaPct ?? 0)).length;

  return (
    <>
      <div className="between">
        <span className="chip">
          Leads recebidos de {fmtDate(ini)} a {fmtDate(agora)} · origem e UTM do CRM
        </span>
        <Seg label="Janela de análise" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />
      </div>

      <Hero
        eyebrow={`Marketing e origem · últimos ${dias} dias`}
        title={
          <>
            O lead é <Hl>ruim</Hl> <Capsule /> ou foi <Ring>mal atendido</Ring>?
          </>
        }
        text={
          efeito.multiplicador ? (
            <>
              Leads com primeiro contato em até 1 hora útil convertem {fmtNum(efeito.multiplicador, 1)} vezes mais. Antes de cortar um canal, veja quanto dele esperou pelo vendedor.
            </>
          ) : (
            'Antes de cortar um canal, veja quanto dele esperou pelo vendedor.'
          )
        }
      />

      <section className="row">
        <div className="card card--rank" style={{ flex: '1 1 300px', justifyContent: 'space-between', gap: 20 }}>
          <span className="eyebrow">Efeito do atendimento rápido</span>
          <span className="big" style={{ fontSize: 'clamp(72px,8vw,104px)', lineHeight: 0.9 }}>{efeito.multiplicador ? `${fmtNum(efeito.multiplicador, 1)}×` : '—'}</span>
          <span style={{ fontSize: 15, lineHeight: 1.5 }}>mais conversão quando o vendedor fala com o lead em até 1 hora útil</span>
        </div>
        <div className="card" style={{ flex: '1 1 220px', borderColor: 'rgba(230,35,78,.35)' }}>
          <span className="muted" style={{ fontSize: 13 }}>Atendidos em até 1h</span>
          <span className="big accent" style={{ fontSize: 52 }}>{fmtPct(efeito.convDentro, 1)}</span>
          <span className="muted" style={{ fontSize: 13 }}>
            de conversão · {efeito.dentro} leads · {efeito.dentroGanhos} ganhos
          </span>
          <div style={{ marginTop: 'auto' }}>
            <Bar pct={total ? (efeito.dentro / total) * 100 : 0} />
          </div>
          <span className="faint" style={{ fontSize: 12 }}>{fmtPct(total ? (efeito.dentro / total) * 100 : null)} dos leads do período</span>
        </div>
        <div className="card" style={{ flex: '1 1 220px' }}>
          <span className="muted" style={{ fontSize: 13 }}>Fora do prazo</span>
          <span className="big" style={{ fontSize: 52 }}>{fmtPct(efeito.convFora, 1)}</span>
          <span className="muted" style={{ fontSize: 13 }}>
            de conversão · {efeito.fora} leads · {efeito.foraGanhos} ganhos
          </span>
          <div style={{ marginTop: 'auto' }}>
            <Bar pct={total ? (efeito.fora / total) * 100 : 0} tone="neutral" />
          </div>
          <span className="faint" style={{ fontSize: 12 }}>{fmtPct(total ? (efeito.fora / total) * 100 : null)} dos leads do período</span>
        </div>
      </section>

      <section className="card">
        <CardHead
          title="Conversão por canal, dentro e fora do prazo"
          sub={`Em ${canaisMelhores} de ${canaisAvaliados} canais, o lead atendido em até 1 hora converte mais. O canal não explica sozinho o resultado.`}
          right={
            <div style={{ display: 'flex', gap: 14, fontSize: 12 }} className="muted">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--rm-500)' }} />Em até 1h</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--neutral-bar)' }} />Fora do prazo</span>
            </div>
          }
        />
        <div className="stack gap-16">
          {canais.map((c) => (
            <div key={c.canal} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,170px) minmax(0,1fr)', gap: 16, alignItems: 'center' }}>
              <div className="stack gap-4">
                <span style={{ fontWeight: 500 }}>{CANAL_LABEL[c.canal]}</span>
                <span className="faint" style={{ fontSize: 12 }}>{c.leads} leads</span>
              </div>
              <div className="stack gap-6">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: `${((c.convNoPrazoPct ?? 0) / maxConv) * 85}%`, minWidth: 3, height: 16, borderRadius: 6, background: 'linear-gradient(90deg,#9C0F31,#F04A6E)', boxShadow: '0 0 16px rgba(230,35,78,.45)' }} />
                  <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{c.noPrazo >= 5 ? fmtPct(c.convNoPrazoPct) : 'poucos leads'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: `${((c.convForaPct ?? 0) / maxConv) * 85}%`, minWidth: 3, height: 16, borderRadius: 6, background: 'var(--neutral-bar)' }} />
                  <span className="num muted" style={{ fontSize: 13 }}>{c.fora >= 5 ? fmtPct(c.convForaPct) : 'poucos leads fora do prazo'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card card--flush">
        <div className="card-pad">
          <CardHead title="Resultado por canal" sub="Do lead recebido pelo vendedor até o contrato ganho" />
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 900 }} role="table" aria-label="Resultado por canal">
            <div role="row" className="trow thead" style={{ gridTemplateColumns: 'minmax(160px,1.3fr) 76px minmax(150px,1.2fr) 120px 100px 76px minmax(170px,1.4fr)' }}>
              <span role="columnheader">Canal</span>
              <span role="columnheader">Leads</span>
              <span role="columnheader">1º contato em 1h</span>
              <span role="columnheader">Comparecimento</span>
              <span role="columnheader">Conversão</span>
              <span role="columnheader">Ganhos</span>
              <span role="columnheader">Perda mais comum</span>
            </div>
            {canais.map((c) => {
              const baixo = (c.slaPct ?? 0) < 60;
              return (
                <div role="row" key={c.canal} className="trow clickable" style={{ gridTemplateColumns: 'minmax(160px,1.3fr) 76px minmax(150px,1.2fr) 120px 100px 76px minmax(170px,1.4fr)' }}>
                  <span role="cell" style={{ fontWeight: 500 }}>{CANAL_LABEL[c.canal]}</span>
                  <span role="cell" className="num">{c.leads}</span>
                  <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bar pct={c.slaPct} tone={baixo ? 'amber' : 'red'} />
                    <span className={`num ${baixo ? 'amber' : ''}`} style={{ width: 40, textAlign: 'right' }}>{fmtPct(c.slaPct)}</span>
                  </span>
                  <span role="cell" className="num">{fmtPct(c.comparecimentoPct)}</span>
                  <span role="cell" className="num" style={{ fontWeight: 600, color: c === piorConv ? 'var(--accent-text)' : undefined }}>{fmtPct(c.conversaoPct)}</span>
                  <span role="cell" className="num">{c.ganhos}</span>
                  <span role="cell" className="muted">{c.perdaMaisComum ?? '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="row">
        <div className="card card--flush" style={{ flex: '2 1 520px' }}>
          <div className="card-pad">
            <CardHead title="Campanhas com mais leads" sub="Pelo utm_campaign que chega ao CRM" />
          </div>
          <div className="tscroll">
            <div style={{ minWidth: 560 }} role="table" aria-label="Campanhas com mais leads">
              <div role="row" className="trow thead" style={{ gridTemplateColumns: 'minmax(190px,1.6fr) 110px 64px 110px 90px' }}>
                <span role="columnheader">Campanha</span>
                <span role="columnheader">Canal</span>
                <span role="columnheader">Leads</span>
                <span role="columnheader">Em até 1h</span>
                <span role="columnheader">Conversão</span>
              </div>
              {campanhas.map((k) => (
                <div role="row" key={k.canal + k.campanha} className="trow clickable" style={{ gridTemplateColumns: 'minmax(190px,1.6fr) 110px 64px 110px 90px' }}>
                  <span role="cell" className="mono" style={{ fontSize: 13 }}>{k.campanha}</span>
                  <span role="cell" className="muted">{CANAL_LABEL[k.canal]}</span>
                  <span role="cell" className="num">{k.leads}</span>
                  <span role="cell" className={`num ${(k.slaPct ?? 0) < 60 ? 'amber' : ''}`}>{fmtPct(k.slaPct)}</span>
                  <span role="cell" className="num" style={{ fontWeight: 600 }}>{fmtPct(k.conversaoPct)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {piorConv && melhorConv && (
          <div className="card card--pink" style={{ flex: '1 1 300px', alignSelf: 'flex-start' }}>
            <span className="eyebrow">Leitura para o marketing</span>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, lineHeight: 1.35, fontWeight: 500 }}>
              {CANAL_LABEL[piorConv.canal]} tem a menor conversão ({fmtPct(piorConv.conversaoPct)}), e {fmtPct(100 - (piorConv.slaPct ?? 0))} dos leads dele esperaram mais de 1 hora.
            </p>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
              Quando atendido no prazo, o lead de {CANAL_LABEL[piorConv.canal]} converte {fmtPct(piorConv.convNoPrazoPct)}. A melhor conversão é de {CANAL_LABEL[melhorConv.canal]} ({fmtPct(melhorConv.conversaoPct)}).
            </p>
          </div>
        )}
      </section>
    </>
  );
}
