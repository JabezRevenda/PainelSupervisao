import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ALERTA_INFO } from '../data/metrics/estado';
import { carteira, fila, metasDoMes, resumoAtendimento, serieDiaria } from '../data/metrics/indicadores';
import { DAY, fmtDate, fmtHours, fmtMinutes, HOUR, isBusinessDay, minutesOfDay, monthName, startOfDay } from '../data/time';
import { ETAPA_LABEL } from '../data/types';
import { usePainel } from '../state/painel';
import { Gauge, Sparkline, StackedColumns } from '../ui/charts';
import { Icon } from '../ui/icons';
import { Avatar, Capsule, CardHead, Delta, fmtNum, fmtPct, Hero, Hl, LinkArrow, Ring, Seg } from '../ui/kit';

type Periodo = 'hoje' | '7d' | '30d';

function saudacao(agora: number) {
  const m = minutesOfDay(agora);
  return m < 12 * 60 ? 'Bom dia' : m < 18 * 60 ? 'Boa tarde' : 'Boa noite';
}

export function VisaoGeral() {
  const { ds, views, agora, config, vendedores, metas, nome, iniciais, abrirLead } = usePainel();
  const p = config.params;
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  const dados = useMemo(() => {
    const ids = vendedores.map((v) => v.id);
    const cart = carteira(views, agora, p);
    const mes = metasDoMes(views, agora, p, metas, ids);
    const hoje = startOfDay(agora);
    let anterior = hoje - DAY;
    while (!isBusinessDay(anterior, p)) anterior -= DAY;
    const janelas: Record<Periodo, [number, number, number, number, number]> = {
      hoje: [hoje, agora, anterior, anterior + DAY, 6],
      '7d': [agora - 7 * DAY, agora, agora - 14 * DAY, agora - 7 * DAY, 5],
      '30d': [agora - 30 * DAY, agora, agora - 60 * DAY, agora - 30 * DAY, 15],
    };
    const [ini, fim, pIni, pFim, nDias] = janelas[periodo];
    const atual = resumoAtendimento(views, ds, p, ini, fim);
    const prev = resumoAtendimento(views, ds, p, pIni, pFim);
    const serie = serieDiaria(views, ds, p, nDias);
    const serie15 = periodo === '30d' ? serie : serieDiaria(views, ds, p, 15);
    const r30 = periodo === '30d' ? atual : resumoAtendimento(views, ds, p, agora - 30 * DAY, agora);
    const itensFila = fila(views, agora, p);
    const parados = ids
      .map((id) => ({ id, n: views.filter((v) => v.vendedorId === id && v.status === 'aberto' && v.horasSemInteracao >= p.paradoHoras).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
    const ranking = ids
      .map((id) => ({
        id,
        ganhos: mes.porVendedor.find((x) => x.id === id)?.ganhos ?? 0,
        sla: resumoAtendimento(views, ds, p, agora - 30 * DAY, agora, id).slaPct ?? 0,
      }))
      .sort((a, b) => b.ganhos - a.ganhos || b.sla - a.sla)
      .slice(0, 5);
    const usoCrm = ids.map((id) => ({ id, uso: resumoAtendimento(views, ds, p, agora - 30 * DAY, agora, id).usoWhatsappCrmPct ?? 0 }));
    // demos de hoje
    let realizadas = 0, agoraN = 0, faltaram = 0, semDesfecho = 0, aSeguir = 0;
    for (const v of views) for (const d of v.demos) {
      if (d.agendadaPara < hoje || d.agendadaPara >= hoje + DAY) continue;
      if (d.status === 'realizada') realizadas++;
      else if (d.status === 'nao_compareceu') faltaram++;
      else if (d.agendadaPara > agora) aSeguir++;
      else if (agora - d.agendadaPara <= HOUR) agoraN++;
      else semDesfecho++;
    }
    return { cart, mes, atual, prev, serie, serie15, r30, itensFila, parados, ranking, usoCrm, demos: { realizadas, agoraN, faltaram, semDesfecho, aSeguir, total: realizadas + agoraN + faltaram + semDesfecho + aSeguir } };
  }, [views, ds, agora, p, periodo, vendedores, metas]);

  const { cart, mes, atual, prev, serie, serie15, r30, itensFila, parados, ranking, usoCrm, demos } = dados;
  const dif = mes.projecao - mes.meta;
  const baixoUso = usoCrm.filter((x) => x.uso < 10).map((x) => nome(x.id));
  const total15 = serie15.reduce((s, d) => s + d.recebidos, 0);
  const noPrazo15 = serie15.reduce((s, d) => s + d.noPrazo, 0);
  const fora15 = serie15.reduce((s, d) => s + d.fora, 0);
  const sparks = {
    recebidos: serie.map((d) => d.recebidos),
    sla: serie.map((d) => (d.noPrazo + d.fora ? (d.noPrazo / (d.noPrazo + d.fora)) * 100 : 0)),
    mediana: serie.map((d) => d.medianaMin ?? 0),
    interacoes: serie.map((d) => d.interacoes),
  };
  const rotPeriodo = periodo === 'hoje' ? 'em relação ao dia útil anterior' : periodo === '7d' ? 'em relação aos 7 dias anteriores' : 'em relação aos 30 dias anteriores';
  const maxParados = Math.max(1, ...parados.map((x) => x.n));

  return (
    <>
      <section className="row" style={{ gap: 24 }}>
        <div className="stack gap-20" style={{ flex: '3 1 440px', minWidth: 0, justifyContent: 'center' }}>
          <Hero
            eyebrow={`Supervisão do Inside Sales · ${monthName(agora)}`}
            title={
              <>
                {saudacao(agora)}. Agora <Hl>{cart.parados} {cart.parados === 1 ? 'lead está parado' : 'leads estão parados'}</Hl> <Capsule /> e <Ring>{cart.semContato}</Ring> {cart.semContato === 1 ? 'espera' : 'esperam'} o primeiro contato.
              </>
            }
            text={
              <>
                São {cart.abertos} leads abertos com {vendedores.length} vendedores. No ritmo atual, {monthName(agora)} fecha com {mes.projecao} contratos,{' '}
                {dif === 0 ? 'exatamente na meta' : `${Math.abs(dif)} ${dif > 0 ? 'acima' : 'abaixo'} da meta de ${mes.meta}`}.
              </>
            }
          />
          <div className="row" style={{ gap: 12 }}>
            <Link to="/fila" className="btn btn--primary" style={{ paddingRight: 12 }}>
              Abrir fila de risco
              <span className="btn-arrow">
                <Icon name="seta" size={14} stroke={2.6} />
              </span>
            </Link>
            <Link to="/performance" className="btn btn--ghost">
              Ver vendedores
            </Link>
          </div>
        </div>

        <div className="card card--feature" style={{ flex: '2 1 340px', padding: '24px 26px 22px' }}>
          <div className="grid-bg" />
          <div className="between" style={{ position: 'relative', alignItems: 'flex-start' }}>
            <div className="stack gap-4">
              <span className="muted" style={{ fontSize: 13 }}>Ganhos em {monthName(agora)}</span>
              <span className="num" style={{ fontSize: 24, fontWeight: 600, color: '#FF6B8A' }}>
                {mes.ganhos} de {mes.meta}
              </span>
            </div>
            <div className="stack gap-4" style={{ textAlign: 'right' }}>
              <span className="muted" style={{ fontSize: 13 }}>Projeção do mês</span>
              <span className="num" style={{ fontSize: 24, fontWeight: 600, color: '#FF6B8A' }}>
                {mes.projecao} contratos
              </span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 1, background: 'rgba(255,255,255,.09)', margin: '4px 0' }} />
          <div style={{ position: 'relative' }}>
            <Gauge pct={mes.projecaoPct ?? 0} label={`Projeção de ${fmtPct(mes.projecaoPct)} da meta de contratos`} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>
              <div className="big" style={{ fontSize: 'clamp(50px,5vw,66px)' }}>{fmtPct(mes.projecaoPct)}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                da meta no ritmo atual · <span style={{ color: '#FF8AA4' }}>{fmtNum(mes.diasPassados, 1)} de {mes.diasTotal} dias úteis</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="between">
        <h2 className="h2">Atendimento</h2>
        <Seg label="Período dos indicadores" value={periodo} onChange={setPeriodo} options={[['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias']]} />
      </section>

      <section className="grid grid-auto-230" aria-label="Indicadores de atendimento">
        {[
          { label: 'Leads recebidos pelos vendedores', valor: fmtNum(atual.recebidos), unid: periodo === 'hoje' ? 'hoje' : 'leads', spark: sparks.recebidos, icon: 'pessoas' as const, delta: <Delta v={prev.recebidos ? ((atual.recebidos - prev.recebidos) / prev.recebidos) * 100 : null} unidade="%" sufixo={rotPeriodo} neutro /> },
          { label: 'Primeiro contato em até 1 hora útil', valor: fmtPct(atual.slaPct), unid: 'meta 85%', spark: sparks.sla, icon: 'relogio' as const, delta: <Delta v={atual.slaPct !== null && prev.slaPct !== null ? atual.slaPct - prev.slaPct : null} sufixo={rotPeriodo} /> },
          { label: 'Tempo mediano até o 1º contato', valor: atual.medianaPrimeiroContatoMin !== null ? fmtMinutes(atual.medianaPrimeiroContatoMin) : '—', unid: 'úteis', spark: sparks.mediana, icon: 'cronometro' as const, delta: <Delta v={atual.medianaPrimeiroContatoMin !== null && prev.medianaPrimeiroContatoMin !== null ? atual.medianaPrimeiroContatoMin - prev.medianaPrimeiroContatoMin : null} unidade="min" invert sufixo={rotPeriodo} /> },
          { label: 'Interações registradas no CRM', valor: fmtNum(atual.interacoes), unid: atual.interacoesPorLead ? `${fmtNum(atual.interacoesPorLead, 1)} por lead` : '', spark: sparks.interacoes, icon: 'conversa' as const, delta: <Delta v={prev.interacoes ? ((atual.interacoes - prev.interacoes) / prev.interacoes) * 100 : null} unidade="%" sufixo={rotPeriodo} /> },
        ].map((k) => (
          <div className="card" key={k.label} style={{ gap: 12, padding: '20px 20px 18px' }}>
            <div className="between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <span className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>{k.label}</span>
              <span className="kpi-icon"><Icon name={k.icon} size={16} /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span className="big" style={{ fontSize: 38 }}>{k.valor}</span>
              <span className="muted" style={{ fontSize: 13 }}>{k.unid}</span>
            </div>
            <Sparkline values={k.spark} />
            <span style={{ fontSize: 12 }}>{k.delta}</span>
          </div>
        ))}
      </section>

      <section className="grid grid-auto-260" aria-label="Alertas da carteira">
        <Link to="/fila" className="card card--pink" style={{ minHeight: 236 }}>
          <div className="between">
            <span className="eyebrow">Leads parados</span>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#0c0b0e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="seta" size={14} stroke={2.4} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="big" style={{ fontSize: 60 }}>{cart.parados}</span>
            <span style={{ fontSize: 14 }}>mais de {p.paradoHoras}h sem interação</span>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 10, minHeight: 80 }}>
            {parados.length === 0 && <span style={{ fontSize: 14 }}>Nenhum lead parado agora.</span>}
            {parados.slice(0, 6).map((x) => (
              <div key={x.id} title={`${nome(x.id)}: ${x.n}`} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{x.n}</span>
                <div style={{ width: '100%', height: (x.n / maxParados) * 48 + 6, borderRadius: '8px 8px 4px 4px', background: '#0c0b0e' }} />
                <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{iniciais(x.id)}</span>
              </div>
            ))}
          </div>
        </Link>

        <div className="card" style={{ minHeight: 236 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="dot dot--amber" />
            <span className="eyebrow" style={{ color: 'var(--amber-text)' }}>Em atenção</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="big" style={{ fontSize: 60 }}>{cart.atencao}</span>
            <span className="muted" style={{ fontSize: 14 }}>de {p.atencaoHoras}h a {p.paradoHoras}h sem interação</span>
          </div>
          <p style={{ margin: 'auto 0 0', fontSize: 14, lineHeight: 1.5 }}>
            {cart.viramParadosHoje > 0 ? (
              <>
                <strong className="amber">{cart.viramParadosHoje} {cart.viramParadosHoje === 1 ? 'vira parado' : 'viram parados'} até as 18h</strong> se ninguém falar com {cart.viramParadosHoje === 1 ? 'ele' : 'eles'} hoje.
              </>
            ) : (
              <span className="muted">Nenhum vira parado antes do fim do expediente.</span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 4, height: 6 }} aria-hidden="true">
            <span style={{ flex: `${Math.max(cart.viramParadosHoje, 0.01)} 1 0`, borderRadius: 3, background: 'var(--amber)' }} />
            <span style={{ flex: `${Math.max(cart.atencao - cart.viramParadosHoje, 0.01)} 1 0`, borderRadius: 3, background: 'var(--amber-soft)' }} />
          </div>
        </div>

        <div className="card" style={{ minHeight: 236 }}>
          <span className="eyebrow">Sem próximo passo</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="big" style={{ fontSize: 60 }}>{cart.semProximoPasso}</span>
            <span className="muted" style={{ fontSize: 14 }}>leads abertos</span>
          </div>
          <p style={{ margin: 'auto 0 0', fontSize: 14, lineHeight: 1.5 }}>
            Mais <strong className="accent">{cart.passoVencido} com passo vencido</strong>. {fmtPct(cart.comProximoPassoPct)} da carteira tem a próxima ação agendada.
          </p>
          <div className="track" aria-hidden="true">
            <span className="fill-red" style={{ width: `${cart.comProximoPassoPct ?? 0}%` }} />
          </div>
        </div>

        <Link to="/agenda" className="card" style={{ minHeight: 236 }}>
          <span className="eyebrow">Demos de hoje</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="big" style={{ fontSize: 60 }}>{demos.total}</span>
            <span className="muted" style={{ fontSize: 14 }}>agendadas</span>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', gap: 3, height: 10 }} aria-hidden="true">
            {[
              [demos.realizadas, 'var(--rm-500)'],
              [demos.agoraN, 'var(--rm-300)'],
              [demos.faltaram, 'var(--neutral-bar)'],
              [demos.semDesfecho, 'var(--amber)'],
              [demos.aSeguir, 'var(--track)'],
            ].map(([n, c], i) => (Number(n) > 0 ? <span key={i} style={{ flex: `${n} 1 0`, borderRadius: 3, background: String(c) }} /> : null))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12 }} className="muted">
            <span><span style={{ color: 'var(--rm-500)' }}>■</span> {demos.realizadas} realizadas</span>
            <span><span style={{ color: 'var(--rm-300)' }}>■</span> {demos.agoraN} agora</span>
            <span><span style={{ color: 'var(--neutral-bar)' }}>■</span> {demos.faltaram} faltaram</span>
            <span><span style={{ color: 'var(--amber)' }}>■</span> {demos.semDesfecho} sem desfecho</span>
            <span>■ {demos.aSeguir} a seguir</span>
          </div>
        </Link>
      </section>

      <div className="card" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: '14px 22px', padding: '16px 20px', background: 'linear-gradient(90deg, rgba(230,35,78,.10), transparent 55%), var(--panel)' }}>
        <span className="kpi-icon" style={{ width: 42, height: 42, flexBasis: 42, borderRadius: 14 }}>
          <Icon name="whatsapp" size={20} />
        </span>
        <p style={{ margin: 0, flex: '1 1 380px', fontSize: 15, lineHeight: 1.55 }} className="muted">
          <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{fmtPct(r30.usoWhatsappCrmPct)} das mensagens saíram pelo WhatsApp do CRM nos últimos 30 dias.</strong> Cada envio por ali
          entra no painel sem registro manual.{baixoUso.length > 0 && ` ${baixoUso.join(', ')} ${baixoUso.length === 1 ? 'está' : 'estão'} abaixo de 10%.`}
        </p>
        <Link to="/performance" className="btn btn--ghost btn--sm">
          Ver uso por vendedor
        </Link>
      </div>

      <section className="row">
        <div className="card" style={{ flex: '2 1 540px' }}>
          <CardHead
            title="Leads recebidos por dia"
            sub="Primeiro contato dentro e fora de 1 hora útil · últimos 15 dias úteis"
            right={
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }} className="muted">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--rm-500)' }} />No prazo</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--neutral-bar)' }} />Fora do prazo</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--amber)' }} />Correndo</span>
              </div>
            }
          />
          <StackedColumns
            ariaLabel={`Leads recebidos por dia nos últimos 15 dias úteis: ${noPrazo15} no prazo e ${fora15} fora do prazo`}
            cols={serie15.map((d, i) => ({
              rotulo: i === serie15.length - 1 ? 'Hoje' : fmtDate(d.dia),
              dica: `${fmtDate(d.dia)}: ${d.recebidos} leads, ${d.noPrazo} no prazo, ${d.fora} fora`,
              destaque: i === serie15.length - 1,
              partes: [
                { valor: d.noPrazo, cor: 'linear-gradient(180deg,#FF6B8A,#C81640)', brilho: '0 0 22px rgba(230,35,78,.75)' },
                { valor: d.correndo, cor: 'var(--amber)' },
                { valor: d.fora, cor: 'var(--neutral-bar)' },
              ],
            }))}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', paddingTop: 14, borderTop: '1px solid var(--line)', fontSize: 13 }} className="muted">
            <span><strong style={{ color: 'var(--text)' }}>{total15} leads</strong> no período</span>
            <span><strong className="accent">{fmtPct(noPrazo15 + fora15 ? (noPrazo15 / (noPrazo15 + fora15)) * 100 : null)} no prazo</strong> · meta 85%</span>
          </div>
        </div>

        <div className="card card--rank" style={{ flex: '1 1 320px', padding: '24px 24px 22px' }}>
          <div className="between">
            <span className="eyebrow">Ranking de {monthName(agora)}</span>
            <Link to="/performance" aria-label="Abrir performance por vendedor" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Icon name="seta" size={14} stroke={2.2} />
            </Link>
          </div>
          <div role="table" aria-label="Ranking do mês">
            <div role="row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.55)', fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              <span role="columnheader" />
              <span role="columnheader">Vendedor</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>Ganhos</span>
              <span role="columnheader" style={{ textAlign: 'right' }}>SLA 1h</span>
            </div>
            {ranking.map((r, i) => (
              <div role="row" key={r.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.3)' }}>
                <span role="cell" className="num" style={{ fontSize: 16, fontWeight: 700 }}>#{i + 1}</span>
                <span role="cell" style={{ fontSize: 15, fontWeight: 500 }}>{nome(r.id)}</span>
                <span role="cell" className="num" style={{ textAlign: 'right', fontSize: 15 }}>{r.ganhos}</span>
                <span role="cell" className="num" style={{ textAlign: 'right', fontSize: 15 }}>{fmtPct(r.sla)}</span>
              </div>
            ))}
          </div>
          <div className="between" style={{ marginTop: 'auto', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: 'rgba(255,255,255,.85)' }}>
              Inside Sales
              <br />
              ganhos do mês e SLA de 30 dias
            </span>
            <span className="num" style={{ fontSize: 30, fontWeight: 600 }}>{monthName(agora).slice(0, 3).toUpperCase()}</span>
          </div>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card-pad between">
          <div className="stack">
            <h2 className="h2">Fila de risco</h2>
            <p className="sub">
              {Math.min(5, itensFila.length)} de {itensFila.length} leads com alerta, do mais grave para o menos grave
            </p>
          </div>
          <LinkArrow to="/fila">Ver fila completa</LinkArrow>
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 820 }}>
            <div className="trow thead" style={{ gridTemplateColumns: '20px minmax(180px,2fr) minmax(150px,1.3fr) minmax(130px,1fr) 110px minmax(180px,1.6fr)' }}>
              <span />
              <span>Lead</span>
              <span>Vendedor</span>
              <span>Etapa</span>
              <span>Sem interação</span>
              <span>Situação</span>
            </div>
            {itensFila.slice(0, 5).map(({ view: v, alertas: al }) => (
              <button
                type="button"
                key={v.lead.id}
                className="trow"
                onClick={() => abrirLead(v.lead.id)}
                style={{ gridTemplateColumns: '20px minmax(180px,2fr) minmax(150px,1.3fr) minmax(130px,1fr) 110px minmax(180px,1.6fr)' }}
              >
                <span className={`dot ${al[0].cor === 'vermelho' ? 'dot--red' : 'dot--amber'}`} />
                <span className="stack gap-4" style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{v.lead.revenda}</span>
                  <span className="faint" style={{ fontSize: 12 }}>{v.lead.cidade}/{v.lead.uf}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar text={iniciais(v.vendedorId)} />
                  {nome(v.vendedorId)}
                </span>
                <span><span className="etapa">{ETAPA_LABEL[v.etapa]}</span></span>
                <span className="mono" style={{ fontSize: 15, color: al[0].cor === 'vermelho' ? 'var(--accent-text)' : 'var(--amber-text)' }}>{fmtHours(v.horasSemInteracao)}</span>
                <span className="muted" style={{ fontSize: 13 }}>{al.map((a) => ALERTA_INFO[a.tipo].rotulo).join(' · ')}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
