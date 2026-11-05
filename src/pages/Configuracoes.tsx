import { type ReactNode } from 'react';
import { META_PADRAO_POR_VENDEDOR } from '../data/params';
import type { Parametros } from '../data/types';
import { type AlertasConfig, usePainel } from '../state/painel';
import { Capsule, CardHead, Hero, Hl, Ring, Switch } from '../ui/kit';

const DIAS: [number, string][] = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const paraMin = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function Linha({ titulo, ajuda, children }: { titulo: string; ajuda?: ReactNode; children: ReactNode }) {
  return (
    <div className="between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
      <div className="stack gap-4">
        <span style={{ fontWeight: 500 }}>{titulo}</span>
        {ajuda && <span className="faint" style={{ fontSize: 12 }}>{ajuda}</span>}
      </div>
      {children}
    </div>
  );
}

export function Configuracoes() {
  const { config, setConfig, resetConfig, vendedores, metas, okrs, ds, fonte } = usePainel();
  const p = config.params;
  const setP = (patch: Partial<Parametros>) => setConfig((c) => ({ ...c, params: { ...c.params, ...patch } }));
  const setAlerta = (k: keyof AlertasConfig, v: boolean) => setConfig((c) => ({ ...c, alertas: { ...c.alertas, [k]: v } }));
  const totalMeta = Object.values(metas).reduce((a, b) => a + b, 0);
  const sdrs = ds.usuarios.filter((u) => u.funcao === 'sdr');

  return (
    <>
      <Hero
        eyebrow="Configurações · só a supervisão edita"
        title={
          <>
            As <Hl>regras</Hl> do painel <Capsule /> mudam aqui, sem <Ring>depender</Ring> da TI.
          </>
        }
        text="Toda mudança vale na hora para todas as telas. Neste protótipo ela fica salva no navegador; na versão com a réplica, fica na tabela de parâmetros."
      />

      <section className="row">
        <div className="card" style={{ flex: '1 1 440px' }}>
          <CardHead title="Prazos" sub="Definem o SLA, os alertas e a Fila de risco" />
          <div className="field">
            <label htmlFor="cfg-sla">Primeiro contato do vendedor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input id="cfg-sla" className="input input--num" type="number" min={5} step={5} value={p.slaPrimeiroContatoMin} onChange={(e) => setP({ slaPrimeiroContatoMin: Math.max(5, Number(e.target.value) || 60) })} />
              <span className="muted">minutos úteis</span>
            </div>
            <span className="help">Conta de quando o SDR atribui o lead ao vendedor. Se o SDR trocar o vendedor, o prazo começa de novo.</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <div className="field">
              <label htmlFor="cfg-atencao">Lead em atenção após</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input id="cfg-atencao" className="input input--num" type="number" min={1} value={p.atencaoHoras} onChange={(e) => setP({ atencaoHoras: Math.max(1, Number(e.target.value) || 24) })} style={{ borderColor: 'rgba(245,165,36,.5)' }} />
                <span className="muted">horas</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="cfg-parado">Lead parado após</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input id="cfg-parado" className="input input--num" type="number" min={1} value={p.paradoHoras} onChange={(e) => setP({ paradoHoras: Math.max(1, Number(e.target.value) || 48) })} style={{ borderColor: 'rgba(230,35,78,.55)' }} />
                <span className="muted">horas</span>
              </div>
            </div>
          </div>
          <div>
            <Linha titulo="Não contar sábado e domingo" ajuda="Vale para os prazos de em atenção e parado (horas corridas)">
              <Switch on={p.descontarFimDeSemana} onChange={(v) => setP({ descontarFimDeSemana: v })} label="Não contar sábado e domingo" />
            </Linha>
            <Linha titulo="Descontar feriados nacionais" ajuda={<span className="amber">Em definição com a supervisão</span>}>
              <Switch on={p.descontarFeriados} onChange={(v) => setP({ descontarFeriados: v })} label="Descontar feriados nacionais" />
            </Linha>
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 380px' }}>
          <CardHead title="Horário comercial" sub="Usado no SLA de primeiro contato" />
          <div className="field">
            <span style={{ fontWeight: 500 }}>Dias úteis</span>
            <div role="group" aria-label="Dias úteis" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DIAS.map(([d, rot]) => {
                const on = p.diasUteis.includes(d);
                return (
                  <button key={d} type="button" className="day-toggle" aria-pressed={on} onClick={() => setP({ diasUteis: on ? p.diasUteis.filter((x) => x !== d) : [...p.diasUteis, d] })}>
                    {rot}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label htmlFor="cfg-ini">Início</label>
              <input id="cfg-ini" className="input" type="time" value={hhmm(p.inicioMin)} onChange={(e) => setP({ inicioMin: paraMin(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="cfg-fim">Fim</label>
              <input id="cfg-fim" className="input" type="time" value={hhmm(p.fimMin)} onChange={(e) => setP({ fimMin: paraMin(e.target.value) })} />
            </div>
          </div>
          <div className="mini" style={{ borderColor: 'rgba(230,35,78,.3)', background: 'rgba(230,35,78,.06)', fontSize: 13, lineHeight: 1.55 }}>
            Exemplo: lead recebido sexta às 17h30 tem prazo até segunda às 8h30 (30 minutos na sexta e 30 na segunda).
          </div>
        </div>
      </section>

      <section className="row">
        <div className="card" style={{ flex: '1 1 440px' }}>
          <CardHead
            title="Metas do mês"
            sub="Contratos ganhos por vendedor"
            right={
              <span className="muted">
                Total do time <strong className="num accent" style={{ fontSize: 22, marginLeft: 6 }}>{totalMeta}</strong>
              </span>
            }
          />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px 18px' }}>
            {vendedores.map((v) => (
              <div key={v.id} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                <label htmlFor={`meta-${v.id}`}>{v.nome}</label>
                <input
                  id={`meta-${v.id}`}
                  className="input input--num"
                  style={{ width: 72, height: 40 }}
                  type="number"
                  min={0}
                  value={metas[v.id] ?? META_PADRAO_POR_VENDEDOR}
                  onChange={(e) => setConfig((c) => ({ ...c, metas: { ...c.metas, [v.id]: Math.max(0, Number(e.target.value) || 0) } }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 380px' }}>
          <CardHead title="Alertas" sub="Só dentro do painel e do CRM" />
          <div>
            {(
              [
                ['slaEstourado', 'Lead sem contato após o SLA', 'Linha vermelha na Fila e notificação'],
                ['parado', 'Lead parado', `Mais de ${p.paradoHoras}h sem interação`],
                ['atencao', 'Lead em atenção', `De ${p.atencaoHoras}h a ${p.paradoHoras}h sem interação`],
                ['resumoDoDia', 'Resumo do dia ao abrir o CRM', 'Por vendedor: sem contato, parados e demos sem desfecho'],
                ['sinalVendedor', 'Sinal na lista do vendedor', 'Opcional: o vendedor vê os próprios atrasos'],
              ] as [keyof AlertasConfig, string, string][]
            ).map(([k, t, a]) => (
              <Linha key={k} titulo={t} ajuda={a}>
                <Switch on={config.alertas[k]} onChange={(v) => setAlerta(k, v)} label={t} />
              </Linha>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <CardHead title="Alvos dos OKRs" sub="Os alvos de exemplo devem ser revistos após 30 dias de medição" />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px 22px' }}>
          {okrs.flatMap((o) =>
            o.resultados.map((kr) => (
              <div key={kr.id} className="between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                <label htmlFor={`kr-${kr.id}`} style={{ fontSize: 14 }}>
                  <span className="faint">{o.codigo} · </span>
                  {kr.nome}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    id={`kr-${kr.id}`}
                    className="input input--num"
                    style={{ width: 76, height: 40 }}
                    type="number"
                    min={0}
                    value={kr.alvo}
                    onChange={(e) => setConfig((c) => ({ ...c, alvosOkr: { ...c.alvosOkr, [kr.id]: Math.max(0, Number(e.target.value) || 0) } }))}
                  />
                  <span className="faint" style={{ width: 14 }}>{kr.unidade}</span>
                </div>
              </div>
            )),
          )}
        </div>
      </section>

      <section className="row">
        <div className="card card--flush" style={{ flex: '2 1 520px' }}>
          <div className="card-pad">
            <CardHead title="Equipe acompanhada" sub="Vem da tabela de usuários do CRM. SDRs e time externo ficam fora dos indicadores." />
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10, padding: '0 22px 22px' }}>
            {vendedores.map((v) => (
              <div key={v.id} className="mini" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <span className="avatar" style={{ width: 34, height: 34, flexBasis: 34 }}>{v.nome.slice(0, 2).toUpperCase()}</span>
                <span className="stack gap-4">
                  <span style={{ fontWeight: 500 }}>{v.nome}</span>
                  <span className="faint" style={{ fontSize: 12 }}>Inside Sales · acompanhado</span>
                </span>
              </div>
            ))}
            {sdrs.map((v) => (
              <div key={v.id} className="mini" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.75 }}>
                <span className="avatar" style={{ width: 34, height: 34, flexBasis: 34 }}>SD</span>
                <span className="stack gap-4">
                  <span style={{ fontWeight: 500 }}>{v.nome}</span>
                  <span className="faint" style={{ fontSize: 12 }}>Pré-vendas · fora do painel</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ flex: '1 1 320px', borderColor: 'rgba(245,165,36,.4)' }}>
          <CardHead title="Simulação" sub={fonte.simulada ? 'Os dados de hoje vêm do simulador' : 'Conectado à réplica do CRM'} />
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>
            O simulador gera leads, interações, demos, ganhos e perdas no ritmo do Inside Sales (cerca de 200 leads por mês), na hora atual. Os perfis de comportamento são sorteados entre os vendedores
            pela semente e não refletem o desempenho real de ninguém.
          </p>
          <div className="field">
            <label htmlFor="cfg-semente">Semente da simulação</label>
            <input id="cfg-semente" className="input" value={config.semente} onChange={(e) => setConfig((c) => ({ ...c, semente: e.target.value || 'revenda-mais' }))} />
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfig((c) => ({ ...c, semente: Math.random().toString(36).slice(2, 8) }))}>
              Sortear outra simulação
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetConfig}>
              Restaurar padrões
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
