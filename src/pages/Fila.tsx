import { useMemo, useState } from 'react';
import { ALERTA_INFO, type TipoAlerta } from '../data/metrics/estado';
import { contarAlertas, fila } from '../data/metrics/indicadores';
import { businessMinutesBetween, fmtClock, fmtDateTime, fmtHours, fmtMinutes, fmtRelativeDay, fmtTime, isBusinessTime } from '../data/time';
import { CANAL_LABEL, ETAPA_LABEL, TIPO_INTERACAO_LABEL } from '../data/types';
import { usePainel, useRelogio } from '../state/painel';
import { Icon } from '../ui/icons';
import { Avatar, Capsule, Hero, Hl, Ring } from '../ui/kit';

type Aba = 'todos' | TipoAlerta;

const ABAS: [Aba, string][] = [
  ['todos', 'Todos'],
  ['sla_estourado', 'SLA estourado'],
  ['prazo_correndo', 'Prazo correndo'],
  ['parado', 'Parados'],
  ['atencao', 'Em atenção'],
  ['demo_sem_desfecho', 'Demo sem desfecho'],
  ['passo_vencido', 'Passo vencido'],
  ['sem_proximo_passo', 'Sem próximo passo'],
];

const COLS = '22px minmax(200px,2fr) minmax(140px,1.2fr) minmax(130px,1fr) 104px minmax(200px,1.6fr) minmax(150px,1.2fr) 18px';

export function Fila() {
  const { views, agora, config, vendedores, nome, iniciais, abrirLead } = usePainel();
  const p = config.params;
  const relogio = useRelogio(1000);
  const [aba, setAba] = useState<Aba>('todos');
  const [vendedor, setVendedor] = useState('todos');

  const itens = useMemo(() => fila(views, agora, p), [views, agora, p]);
  const filtradosVend = vendedor === 'todos' ? itens : itens.filter((x) => x.view.vendedorId === vendedor);
  const contagem = contarAlertas(filtradosVend);
  const linhas = aba === 'todos' ? filtradosVend : filtradosVend.filter((x) => x.alertas.some((a) => a.tipo === aba));
  const acao = itens.filter((x) => x.alertas[0].gravidade <= 5).length;
  const relogios = itens
    .filter((x) => x.view.primeiroContatoEm === null)
    .sort((a, b) => a.view.atribuidoEm - b.view.atribuidoEm)
    .slice(0, 4);
  const expediente = isBusinessTime(relogio, p);

  return (
    <>
      <Hero
        eyebrow="Fila de risco · por gravidade"
        title={
          <>
            <Hl>{acao} leads</Hl> <Capsule /> pedem <Ring>ação</Ring> agora.
          </>
        }
        text="Primeiro quem ainda não teve contato, depois os parados há mais de 48h e os em atenção. Clique em um lead para ver a linha do tempo."
      />

      {relogios.length > 0 && (
        <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }} aria-label="Prazo de primeiro contato">
          {relogios.map(({ view: v }) => {
            const decorrido = businessMinutesBetween(v.atribuidoEm, relogio, p);
            const limite = p.slaPrimeiroContatoMin;
            const estourou = decorrido >= limite;
            const pct = Math.min(100, (decorrido / limite) * 100);
            return (
              <div
                key={v.lead.id}
                className="card"
                style={
                  estourou
                    ? { borderColor: 'rgba(230,35,78,.55)', background: 'radial-gradient(120% 100% at 100% 0%, rgba(230,35,78,.2), transparent 60%), var(--panel)', boxShadow: '0 30px 80px -40px rgba(230,35,78,.7)' }
                    : { borderColor: 'rgba(245,165,36,.4)', background: 'radial-gradient(120% 100% at 100% 0%, rgba(245,165,36,.12), transparent 60%), var(--panel)' }
                }
              >
                <div className="between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <div className="stack gap-4" style={{ minWidth: 0 }}>
                    <span className="eyebrow" style={{ color: estourou ? 'var(--accent-text)' : 'var(--amber-text)' }}>
                      {estourou ? 'SLA estourado' : 'Prazo correndo'}
                    </span>
                    <span className="num" style={{ fontSize: 19, fontWeight: 500 }}>{v.lead.revenda}</span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {nome(v.vendedorId)} · {v.lead.cidade}/{v.lead.uf} · {CANAL_LABEL[v.lead.canal]}
                    </span>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => abrirLead(v.lead.id)}>
                    Ver ficha
                  </button>
                </div>
                <div className="between" style={{ alignItems: 'baseline' }}>
                  <span className="mono" style={{ fontSize: 'clamp(36px,4vw,50px)', fontWeight: 500, letterSpacing: '-.04em', lineHeight: 1, color: estourou ? 'var(--accent-text)' : 'var(--text)' }}>
                    {fmtClock(decorrido * 60_000)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: estourou ? 'var(--accent-text)' : 'var(--amber-text)' }}>
                    {estourou ? `Estourado há ${fmtMinutes(decorrido - limite)}` : `Faltam ${fmtMinutes(limite - decorrido)}`}
                  </span>
                </div>
                <span className="track" style={{ height: 8, minHeight: 8, maxHeight: 8 }}>
                  <span className={estourou ? 'fill-red' : 'fill-amber'} style={{ width: `${pct}%`, boxShadow: estourou ? '0 0 16px rgba(230,35,78,.8)' : undefined }} />
                </span>
                <div className="between faint" style={{ fontSize: 12 }}>
                  <span>Recebido {fmtRelativeDay(v.atribuidoEm, agora)} às {fmtTime(v.atribuidoEm)}</span>
                  <span>{expediente ? 'Conta só no expediente' : 'Pausado fora do expediente'}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card card--flush">
        <div className="card-pad stack gap-12" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="between">
            <div className="tabs" role="group" aria-label="Filtrar por alerta">
              {ABAS.map(([id, rot]) => {
                const n = id === 'todos' ? filtradosVend.length : contagem[id];
                if (id !== 'todos' && n === 0) return null;
                return (
                  <button key={id} type="button" className="tab" aria-pressed={aba === id} onClick={() => setAba(id)}>
                    {rot} <span className="count">{n}</span>
                  </button>
                );
              })}
            </div>
            <label className="stack gap-4" style={{ fontSize: 12 }}>
              <span className="faint">Vendedor</span>
              <select className="input" style={{ height: 38, fontSize: 14 }} value={vendedor} onChange={(e) => setVendedor(e.target.value)}>
                <option value="todos">Todos</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="tscroll">
          <div style={{ minWidth: 1080 }}>
            <div className="trow thead" style={{ gridTemplateColumns: COLS, borderTop: 0 }}>
              <span />
              <span>Lead</span>
              <span>Vendedor</span>
              <span>Etapa</span>
              <span>Sem interação</span>
              <span>Última interação</span>
              <span>Próximo passo</span>
              <span />
            </div>
            {linhas.length === 0 && <div className="card-pad muted">Nenhum lead nesta categoria agora.</div>}
            {linhas.map(({ view: v, alertas: al }) => {
              const ult = v.interacoes[v.interacoes.length - 1];
              const vermelho = al[0].cor === 'vermelho';
              const prox = v.proximoPasso
                ? { t: `${fmtRelativeDay(v.proximoPasso.previstoPara, agora)} · ${fmtTime(v.proximoPasso.previstoPara)}`, c: 'var(--text-2)' }
                : v.proximaDemo
                  ? { t: `Demo ${fmtRelativeDay(v.proximaDemo.agendadaPara, agora)} · ${fmtTime(v.proximaDemo.agendadaPara)}`, c: 'var(--text-2)' }
                  : v.passoVencido
                    ? { t: `Vencido · ${fmtRelativeDay(v.passoVencido.previstoPara, agora)}`, c: 'var(--accent-text)' }
                    : { t: 'Sem próximo passo', c: 'var(--accent-text)' };
              return (
                <button type="button" key={v.lead.id} className="trow" style={{ gridTemplateColumns: COLS }} onClick={() => abrirLead(v.lead.id)} aria-label={`Abrir ficha de ${v.lead.revenda}`}>
                  <span className={`dot ${vermelho ? 'dot--red' : 'dot--amber'}`} />
                  <span className="stack gap-4" style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 500 }}>{v.lead.revenda}</span>
                    <span className="faint" style={{ fontSize: 12 }}>
                      {v.lead.cidade}/{v.lead.uf} · {CANAL_LABEL[v.lead.canal]}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar text={iniciais(v.vendedorId)} />
                    {nome(v.vendedorId)}
                  </span>
                  <span>
                    <span className="etapa">{ETAPA_LABEL[v.etapa]}</span>
                  </span>
                  <span className="mono" style={{ fontSize: 15, color: vermelho ? 'var(--accent-text)' : 'var(--amber-text)' }}>
                    {fmtHours(v.horasSemInteracao)}
                  </span>
                  <span className="stack gap-4">
                    <span style={{ fontSize: 13 }}>{ult ? `${TIPO_INTERACAO_LABEL[ult.tipo]} · ${fmtDateTime(ult.registradoEm)}` : 'Nenhuma interação'}</span>
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {al.map((a) => (
                        <span key={a.tipo} className={`tag ${a.cor === 'vermelho' ? 'tag--red' : 'tag--amber'}`}>
                          {ALERTA_INFO[a.tipo].rotulo}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: prox.c }}>{prox.t}</span>
                  <Icon name="chevron" size={16} className="faint" />
                </button>
              );
            })}
          </div>
        </div>
        <div className="card-pad between faint" style={{ fontSize: 12 }}>
          <span>
            {linhas.length} {linhas.length === 1 ? 'lead' : 'leads'} nesta categoria
          </span>
          <span>
            SLA em horas úteis ({String(p.inicioMin / 60).padStart(2, '0')}h–{p.fimMin / 60}h). Sem interação em horas corridas{p.descontarFimDeSemana ? ', sem fim de semana' : ''}.
          </span>
        </div>
      </section>
    </>
  );
}
