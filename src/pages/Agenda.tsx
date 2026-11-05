import { useMemo } from 'react';
import type { LeadView } from '../data/metrics/estado';
import { resumoDemos } from '../data/metrics/indicadores';
import { DAY, fmtDate, fmtLongDate, fmtRelativeDay, fmtTime, HOUR, isBusinessDay, startOfDay, startOfWeek, weekdayShort } from '../data/time';
import { CANAL_LABEL, type Demo } from '../data/types';
import { usePainel } from '../state/painel';
import { Donut } from '../ui/charts';
import { Icon } from '../ui/icons';
import { Avatar, Bar, Capsule, CardHead, fmtPct, Hero, Hl, Ring } from '../ui/kit';

type Situacao = 'realizada' | 'faltou' | 'sem_desfecho' | 'agora' | 'agendada';

const SIT: Record<Situacao, { rotulo: string; cls: string; dot: string }> = {
  realizada: { rotulo: 'Realizada', cls: 'tag tag--red', dot: 'dot dot--red' },
  agora: { rotulo: 'Em andamento', cls: 'tag tag--solid', dot: 'dot dot--red' },
  faltou: { rotulo: 'Não compareceu', cls: 'tag', dot: 'dot dot--gray' },
  sem_desfecho: { rotulo: 'Sem desfecho', cls: 'tag tag--amber', dot: 'dot dot--amber' },
  agendada: { rotulo: 'Agendada', cls: 'tag', dot: 'dot dot--gray' },
};

function situacao(d: Demo, agora: number): Situacao {
  if (d.status === 'realizada') return 'realizada';
  if (d.status === 'nao_compareceu') return 'faltou';
  if (d.agendadaPara > agora) return 'agendada';
  return agora - d.agendadaPara <= HOUR ? 'agora' : 'sem_desfecho';
}

export function Agenda() {
  const { views, agora, config, vendedores, nome, iniciais, abrirLead } = usePainel();
  const p = config.params;

  const dados = useMemo(() => {
    const hoje = startOfDay(agora);
    const todas: { d: Demo; v: LeadView }[] = [];
    for (const v of views) for (const d of v.demos) todas.push({ d, v });
    const doDia = (dia: number) => todas.filter((x) => x.d.agendadaPara >= dia && x.d.agendadaPara < dia + DAY).sort((a, b) => a.d.agendadaPara - b.d.agendadaPara);
    const hojeLista = doDia(hoje);
    const semana: number[] = [];
    for (let d = startOfWeek(agora); semana.length < 5; d += DAY) if (isBusinessDay(d, p)) semana.push(d);
    let proximo = hoje + DAY;
    while (!isBusinessDay(proximo, p)) proximo += DAY;
    if (!semana.includes(proximo)) semana.push(proximo);
    const iniSemana = startOfWeek(agora);
    const resumoSemana = resumoDemos(views, agora, iniSemana, agora);
    const semDesfecho = todas.filter((x) => situacao(x.d, agora) === 'sem_desfecho' && x.d.agendadaPara > agora - 7 * DAY).sort((a, b) => b.d.agendadaPara - a.d.agendadaPara);
    const porVend = vendedores.map((u) => ({
      u,
      r: resumoDemos(views, agora, iniSemana, agora, u.id),
      seguir: resumoDemos(views, agora, agora, iniSemana + 7 * DAY, u.id).futuras,
    }));
    return { hojeLista, semana, doDia, resumoSemana, semDesfecho, porVend, iniSemana };
  }, [views, agora, p, vendedores]);

  const { hojeLista, semana, doDia, resumoSemana, semDesfecho, porVend } = dados;
  const semDesfechoHoje = hojeLista.filter((x) => situacao(x.d, agora) === 'sem_desfecho').length;
  const semContatoAntes = hojeLista.filter((x) => situacao(x.d, agora) === 'agendada' && x.v.primeiroContatoEm === null).length;
  const idxAgora = hojeLista.findIndex((x) => x.d.agendadaPara > agora);

  return (
    <>
      <Hero
        eyebrow={`Agenda de demos · ${fmtLongDate(agora)}`}
        title={
          <>
            Hoje são <Hl>{hojeLista.length} demos</Hl>. <Ring>{semDesfechoHoje}</Ring> {semDesfechoHoje === 1 ? 'está' : 'estão'} sem desfecho <Capsule />
            {semContatoAntes === 0
              ? ' e nenhuma demo a seguir está sem contato prévio.'
              : ` e ${semContatoAntes} ${semContatoAntes === 1 ? 'lead ainda não teve' : 'leads ainda não tiveram'} contato antes da demo.`}
          </>
        }
        text="Toda demo com horário passado precisa de desfecho: realizada ou não compareceu. É daqui que sai a taxa de comparecimento."
      />

      <section className="grid grid-auto-160" aria-label="Demos da semana">
        {semana.map((dia) => {
          const lista = doDia(dia);
          const passadas = lista.filter((x) => x.d.status !== 'agendada');
          const real = passadas.filter((x) => x.d.status === 'realizada').length;
          const ehHoje = dia === startOfDay(agora);
          const futuro = dia > startOfDay(agora);
          const comp = passadas.length ? (real / passadas.length) * 100 : null;
          const semD = lista.filter((x) => situacao(x.d, agora) === 'sem_desfecho').length;
          return (
            <div
              key={dia}
              className="card"
              style={{
                padding: 18,
                gap: 10,
                ...(ehHoje ? { borderColor: 'rgba(230,35,78,.55)', background: 'radial-gradient(120% 120% at 50% 0%, rgba(230,35,78,.22), transparent 70%), var(--panel)' } : {}),
                ...(futuro ? { borderStyle: 'dashed' } : {}),
              }}
            >
              <span className={ehHoje ? 'accent' : 'muted'} style={{ fontSize: 13, fontWeight: ehHoje ? 600 : 400 }}>
                {weekdayShort(dia)} · {fmtDate(dia)} {ehHoje ? '· hoje' : ''}
              </span>
              <span className="big" style={{ fontSize: 32 }}>
                {lista.length} <span className="faint" style={{ fontSize: 13, fontFamily: 'var(--font-ui)', letterSpacing: 0, fontWeight: 400 }}>{futuro ? 'agendadas' : 'demos'}</span>
              </span>
              <Bar pct={futuro ? 0 : comp} />
              <span className="muted" style={{ fontSize: 12 }}>
                {futuro
                  ? `${lista.filter((x) => x.v.primeiroContatoEm === null).length} ainda sem contato`
                  : comp === null
                    ? 'Nenhuma concluída ainda'
                    : `${fmtPct(comp)} compareceram`}
                {semD > 0 && <span className="amber"> · {semD} sem desfecho</span>}
              </span>
            </div>
          );
        })}
      </section>

      <section className="row" style={{ alignItems: 'flex-start' }}>
        <div className="card card--flush" style={{ flex: '2 1 560px', paddingBottom: 8 }}>
          <div className="card-pad">
            <CardHead title="Demos de hoje" sub={`Horário de Brasília · atualizado às ${fmtTime(agora)}`} />
          </div>
          {hojeLista.length === 0 && <div className="card-pad muted">Nenhuma demo marcada para hoje.</div>}
          {hojeLista.map(({ d, v }, i) => {
            const s = situacao(d, agora);
            const aviso = s === 'agendada' && v.primeiroContatoEm === null ? 'Nenhum contato do vendedor antes da demo' : null;
            return (
              <div key={d.id}>
                {i === idxAgora && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 22px' }} aria-label={`Agora, ${fmtTime(agora)}`}>
                    <span className="mono accent" style={{ fontSize: 12, fontWeight: 600, width: 54 }}>{fmtTime(agora)}</span>
                    <span className="live-dot" />
                    <span style={{ flex: '1 1 auto', height: 2, background: 'linear-gradient(90deg, var(--rm-500), transparent)', boxShadow: '0 0 12px rgba(230,35,78,.8)' }} />
                    <span className="eyebrow">Agora</span>
                  </div>
                )}
                <button type="button" className="trow" style={{ gridTemplateColumns: '54px 12px minmax(0,1fr)', borderBottom: 0 }} onClick={() => abrirLead(v.lead.id)}>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 500, color: s === 'agendada' ? 'var(--text)' : 'var(--text-3)' }}>{fmtTime(d.agendadaPara)}</span>
                  <span className={SIT[s].dot} />
                  <span className="between" style={{ minWidth: 0 }}>
                    <span className="stack gap-4" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 500 }}>{v.lead.revenda}</span>
                      <span className="faint" style={{ fontSize: 12 }}>
                        {v.lead.cidade}/{v.lead.uf} · {CANAL_LABEL[v.lead.canal]} · {nome(d.vendedorId)}
                      </span>
                      {aviso && <span className="amber" style={{ fontSize: 12, fontWeight: 600 }}>{aviso}</span>}
                    </span>
                    <span className={SIT[s].cls}>{SIT[s].rotulo}</span>
                  </span>
                </button>
              </div>
            );
          })}
          {idxAgora === -1 && hojeLista.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 22px' }}>
              <span className="mono accent" style={{ fontSize: 12, fontWeight: 600, width: 54 }}>{fmtTime(agora)}</span>
              <span className="live-dot" />
              <span style={{ flex: '1 1 auto', height: 2, background: 'linear-gradient(90deg, var(--rm-500), transparent)' }} />
              <span className="eyebrow">Agora</span>
            </div>
          )}
        </div>

        <div className="stack gap-16" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="card card--feature" style={{ alignItems: 'center' }}>
            <span className="eyebrow" style={{ alignSelf: 'flex-start' }}>Comparecimento · semana</span>
            <div style={{ position: 'relative', width: 180, height: 180 }}>
              <Donut pct={resumoSemana.comparecimentoPct ?? 0} size={180} label={`${fmtPct(resumoSemana.comparecimentoPct)} de comparecimento nesta semana`} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="big" style={{ fontSize: 42 }}>{fmtPct(resumoSemana.comparecimentoPct)}</span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {resumoSemana.realizadas} de {resumoSemana.realizadas + resumoSemana.faltaram}
                </span>
              </div>
            </div>
            <div className="grid" style={{ width: '100%', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="mini" style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.08)' }}>
                <span className="muted" style={{ fontSize: 12 }}>Faltaram</span>
                <span className="num" style={{ fontSize: 22 }}>{resumoSemana.faltaram}</span>
              </div>
              <div className="mini" style={{ background: 'rgba(245,165,36,.1)', borderColor: 'rgba(245,165,36,.3)' }}>
                <span style={{ fontSize: 12, color: '#FFC46B' }}>Sem desfecho</span>
                <span className="num" style={{ fontSize: 22 }}>{resumoSemana.semDesfecho}</span>
              </div>
            </div>
          </div>

          <div className="card card--pink">
            <span className="eyebrow">Precisam de desfecho</span>
            {semDesfecho.length === 0 && <span style={{ fontSize: 14 }}>Todas as demos passadas têm desfecho registrado.</span>}
            {semDesfecho.slice(0, 4).map(({ d, v }) => (
              <button
                key={d.id}
                type="button"
                onClick={() => abrirLead(v.lead.id)}
                style={{ textAlign: 'left', padding: 14, borderRadius: 16, border: 0, background: 'rgba(12,11,14,.82)', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <span style={{ fontSize: 15, fontWeight: 500 }}>{v.lead.revenda}</span>
                <span style={{ fontSize: 12, color: '#D4D0D8' }}>
                  {fmtRelativeDay(d.agendadaPara, agora)} {fmtTime(d.agendadaPara)} · {nome(d.vendedorId)}
                </span>
              </button>
            ))}
            {semDesfecho.length > 4 && <span style={{ fontSize: 13 }}>e mais {semDesfecho.length - 4}</span>}
          </div>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card-pad">
          <CardHead title="Por vendedor nesta semana" sub="Demos com horário já passado, desde segunda-feira" />
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 760 }} role="table" aria-label="Demos por vendedor nesta semana">
            <div role="row" className="trow thead" style={{ gridTemplateColumns: 'minmax(180px,1.6fr) 90px 90px 90px 110px minmax(200px,2fr)' }}>
              <span role="columnheader">Vendedor</span>
              <span role="columnheader">Realizadas</span>
              <span role="columnheader">Faltaram</span>
              <span role="columnheader">Sem desfecho</span>
              <span role="columnheader">A seguir</span>
              <span role="columnheader">Comparecimento</span>
            </div>
            {porVend.map(({ u, r, seguir }) => {
              const baixo = r.comparecimentoPct !== null && r.comparecimentoPct < 70;
              return (
                <div role="row" key={u.id} className="trow clickable" style={{ gridTemplateColumns: 'minmax(180px,1.6fr) 90px 90px 90px 110px minmax(200px,2fr)' }}>
                  <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar text={iniciais(u.id)} />
                    {u.nome}
                  </span>
                  <span role="cell" className="num">{r.realizadas}</span>
                  <span role="cell" className="num">{r.faltaram}</span>
                  <span role="cell" className={`num ${r.semDesfecho ? 'amber' : 'faint'}`}>{r.semDesfecho}</span>
                  <span role="cell" className="num faint">{seguir}</span>
                  <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Bar pct={r.comparecimentoPct} tone={baixo ? 'amber' : 'red'} />
                    <span className={`num ${baixo ? 'amber' : ''}`} style={{ width: 44, textAlign: 'right' }}>{fmtPct(r.comparecimentoPct)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-pad faint" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="relogio" size={14} /> Uma demo vira "sem desfecho" 1 hora depois do horário marcado.
        </div>
      </section>
    </>
  );
}
