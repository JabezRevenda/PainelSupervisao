import { useMemo, useState } from 'react';
import { fechamento, funil } from '../data/metrics/indicadores';
import { DAY, fmtDate } from '../data/time';
import { ETAPA_LABEL, ETAPAS_FUNIL } from '../data/types';
import { usePainel } from '../state/painel';
import { Icon } from '../ui/icons';
import { Capsule, CardHead, Delta, fmtNum, fmtPct, Hero, Hl, Ring, Seg } from '../ui/kit';

type Janela = '30' | '60' | '90';

const ARTIGO: Record<string, string> = {
  demo_agendada: 'a demo agendada',
  demo_realizada: 'a demo realizada',
  proposta_enviada: 'a proposta',
  negociacao: 'a negociação',
  ganho: 'o ganho',
};

export function Funil() {
  const { views, agora, vendedores } = usePainel();
  const [janela, setJanela] = useState<Janela>('60');
  const dias = Number(janela);

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const etapas = funil(views, ini, agora);
    const anteriores = funil(views, ini - dias * DAY, ini);
    const fech = fechamento(views, ini, agora);
    const porVend = vendedores.map((u) => ({ u, et: funil(views, ini, agora, (v) => v.vendedorId === u.id) }));
    return { ini, etapas, anteriores, fech, porVend };
  }, [views, agora, dias, vendedores]);

  const { ini, etapas, anteriores, fech, porVend } = d;
  const base = etapas[0].n || 1;
  const transicoes = etapas.slice(1);
  const pior = [...transicoes].sort((a, b) => (a.conversao ?? 100) - (b.conversao ?? 100))[0];
  const idxPior = ETAPAS_FUNIL.indexOf(pior.etapa);
  const lenta = [...transicoes].sort((a, b) => (b.diasMedios ?? 0) - (a.diasMedios ?? 0))[0];
  const ganhos = etapas[etapas.length - 1].n;

  return (
    <>
      <div className="between">
        <span className="chip">
          Leads recebidos de {fmtDate(ini)} a {fmtDate(agora)}
        </span>
        <Seg label="Janela de análise" value={janela} onChange={setJanela} options={[['30', '30 dias'], ['60', '60 dias'], ['90', '90 dias']]} />
      </div>

      <Hero
        eyebrow={`Funil do vendedor · últimos ${dias} dias`}
        title={
          <>
            A maior perda está entre {ARTIGO[ETAPAS_FUNIL[idxPior - 1]].split(' ')[0]} <Hl>{ARTIGO[ETAPAS_FUNIL[idxPior - 1]].split(' ').slice(1).join(' ')}</Hl> <Capsule /> e{' '}
            {ARTIGO[pior.etapa].split(' ')[0]} <Ring>{ARTIGO[pior.etapa].split(' ').slice(1).join(' ')}</Ring>.
          </>
        }
        text={
          <>
            {fmtPct(100 - (pior.conversao ?? 0))} dos leads em {ETAPA_LABEL[ETAPAS_FUNIL[idxPior - 1]].toLowerCase()} não chegam a {ETAPA_LABEL[pior.etapa].toLowerCase()}. De {etapas[0].n} leads que chegaram aos vendedores, {ganhos} já viraram contrato
            ganho e {fech.emAberto} seguem em aberto.
            {dias === 30 && ' Na janela de 30 dias, parte dos leads ainda não teve tempo de avançar.'}
          </>
        }
      />

      <section className="card card--feature" style={{ padding: '28px clamp(18px,3vw,36px)', gap: 6 }} aria-label="Funil de conversão">
        {etapas.map((e, i) => {
          const w = (e.n / base) * 100;
          const a = 1 - i * 0.14;
          const ant = anteriores[i];
          const ehPior = e.etapa === pior.etapa;
          return (
            <div key={e.etapa} className="stack gap-6">
              {i > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 12, flexWrap: 'wrap' }}>
                  <Icon name="baixo" size={14} />
                  <strong style={{ color: '#fff' }}>{fmtPct(e.conversao)} avançam</strong>
                  <span style={{ color: ehPior ? '#FF8AA4' : '#B4B0BA' }}>−{etapas[i - 1].n - e.n} saem</span>
                  <span className="muted">· em média {fmtNum(e.diasMedios, 1)} dias</span>
                  <span>
                    · <Delta v={e.conversao !== null && ant.conversao !== null ? e.conversao - ant.conversao : null} sufixo={`vs ${dias} dias anteriores`} />
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,160px) minmax(0,1fr) 56px', gap: 16, alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: 14 }}>{ETAPA_LABEL[e.etapa]}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div
                    title={`${ETAPA_LABEL[e.etapa]}: ${e.n}`}
                    style={{
                      width: `${w}%`,
                      minWidth: 56,
                      height: 54,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontSize: 20,
                      fontWeight: 600,
                      color: '#fff',
                      background:
                        e.etapa === 'ganho'
                          ? 'linear-gradient(90deg,#E6234E,#FF6B8A,#E6234E)'
                          : `linear-gradient(90deg, rgba(230,35,78,${(a * 0.5).toFixed(2)}), rgba(230,35,78,${a.toFixed(2)}), rgba(230,35,78,${(a * 0.5).toFixed(2)}))`,
                      boxShadow: e.etapa === 'ganho' ? '0 0 40px rgba(230,35,78,.75)' : `0 0 24px rgba(230,35,78,${(a * 0.35).toFixed(2)})`,
                    }}
                  >
                    {e.n}
                  </div>
                </div>
                <span className="num muted" style={{ textAlign: 'right', fontSize: 13 }}>{Math.round(w)}%</span>
              </div>
            </div>
          );
        })}
        <div className="muted" style={{ textAlign: 'right', fontSize: 12, paddingTop: 8 }}>% do total que chegou ao vendedor</div>
      </section>

      <section className="grid grid-auto-230">
        <div className="card card--pink">
          <span className="eyebrow">Taxa de ganho</span>
          <span className="big" style={{ fontSize: 52 }}>{fmtPct(fech.taxaGanhoPct)}</span>
          <span style={{ fontSize: 13 }}>
            {fech.ganhos} ganhos em {fech.ganhos + fech.perdidos} negociações encerradas no período
          </span>
        </div>
        <div className="card">
          <span className="eyebrow">Ciclo de venda</span>
          <span className="big" style={{ fontSize: 52 }}>
            {fmtNum(fech.cicloMedioDias, 1)} <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--font-ui)', letterSpacing: 0 }}>dias</span>
          </span>
          <span className="muted" style={{ fontSize: 13 }}>Mediana de {fmtNum(fech.cicloMedianoDias, 1)} dias, do recebimento ao ganho</span>
        </div>
        <div className="card">
          <span className="eyebrow">Etapa mais lenta</span>
          <span className="big" style={{ fontSize: 52 }}>
            {fmtNum(lenta.diasMedios, 1)} <span className="muted" style={{ fontSize: 16, fontFamily: 'var(--font-ui)', letterSpacing: 0 }}>dias</span>
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            Até {ETAPA_LABEL[lenta.etapa].toLowerCase()}
          </span>
        </div>
        <div className="card">
          <span className="eyebrow">Em aberto no funil</span>
          <span className="big" style={{ fontSize: 52 }}>{fech.emAberto}</span>
          <span className="muted" style={{ fontSize: 13 }}>Dos {etapas[0].n} leads do período, ainda sem ganho ou perda</span>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card-pad">
          <CardHead title="Conversão por etapa e vendedor" sub="Quanto mais rosa, maior a conversão. Em amarelo, 10 pontos ou mais abaixo do time." />
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 820 }} role="table" aria-label="Conversão por etapa e vendedor">
            <div role="row" className="trow thead" style={{ gridTemplateColumns: 'minmax(170px,1.3fr) repeat(4, minmax(120px,1fr))' }}>
              <span role="columnheader">Vendedor</span>
              {transicoes.map((t, i) => (
                <span role="columnheader" key={t.etapa} style={{ textAlign: 'center' }}>
                  {ETAPA_LABEL[ETAPAS_FUNIL[i]].replace('Demo ', '')} → {ETAPA_LABEL[t.etapa].replace('Demo ', '').toLowerCase()}
                </span>
              ))}
            </div>
            {[...porVend.map(({ u, et }) => ({ nome: u.nome, et, time: false })), { nome: 'Time', et: etapas, time: true }].map((linha) => (
              <div role="row" key={linha.nome} className={`trow${linha.time ? ' total' : ''}`} style={{ gridTemplateColumns: 'minmax(170px,1.3fr) repeat(4, minmax(120px,1fr))', padding: '8px 22px' }}>
                <span role="cell" style={{ fontWeight: linha.time ? 700 : 500 }}>{linha.nome}</span>
                {linha.et.slice(1).map((t, i) => {
                  const ref = transicoes[i].conversao ?? 0;
                  const v = t.conversao;
                  const baixo = !linha.time && v !== null && v <= ref - 10;
                  const a = v === null ? 0.06 : Math.max(0.08, Math.min(0.78, (v - 30) / 60));
                  return (
                    <span
                      role="cell"
                      key={t.etapa}
                      className="num"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 40,
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        background: linha.time ? 'var(--panel-2)' : baixo ? 'var(--amber-soft)' : `rgba(230,35,78,${a.toFixed(2)})`,
                        color: baixo ? 'var(--amber-text)' : linha.time ? 'var(--text)' : a > 0.4 ? '#fff' : 'var(--text)',
                        border: `1px solid ${baixo ? 'rgba(245,165,36,.4)' : linha.time ? 'var(--line-2)' : `rgba(230,35,78,${Math.min(0.9, a + 0.15).toFixed(2)})`}`,
                      }}
                      title={`${t.n} leads`}
                    >
                      {fmtPct(v)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
