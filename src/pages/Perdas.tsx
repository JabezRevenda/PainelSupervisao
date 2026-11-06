import { motion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';
import { Bloco, Capsule, Contexto, Dot, fmtPct, Hl, Intro, NameAvatar, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { perdas, resumoAtendimento } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { ETAPA_COR, ETAPA_LABEL } from '@/data/types';
import { usePainel } from '@/state/painel';

export function Perdas({ dias, topo }: { dias: number; topo: ReactNode }) {
  const { ds, views, agora, config, nome, abrirLead } = usePainel();

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const r = perdas(views, ini, agora);
    const anterior = perdas(views, ini - dias * DAY, ini).total;
    const lentos = new Set([...r.porVendedor.keys()].filter((id) => (resumoAtendimento(views, ds, config.params, ini, agora, id).slaPct ?? 100) < 50));
    return { ini, r, anterior, lentos };
  }, [views, ds, agora, dias, config.params]);

  const { ini, r, anterior, lentos } = d;
  const motivoNome = (id: string) => ds.motivos.find((m) => m.id === id)?.nome ?? 'Sem motivo';
  const motivos = [...r.porMotivo.entries()].sort((a, b) => b[1] - a[1]);
  const maxMotivo = Math.max(1, ...motivos.map((m) => m[1]));
  const semRetorno = r.porMotivo.get('sem_retorno') ?? 0;
  let semRetornoLentos = 0;
  for (const [id, pv] of r.porVendedor) if (lentos.has(id)) semRetornoLentos += pv.motivos.get('sem_retorno') ?? 0;
  const pct = (n: number) => (r.total ? (n / r.total) * 100 : null);
  const resgate = r.porDestino.get('resgate_sdr') ?? 0;
  const limbo = r.porDestino.get('limbo_sdr') ?? 0;
  const naNegociacao = r.porEtapa.get('negociacao') ?? 0;
  const semInterPorVend = new Map<string, number>();
  for (const v of r.semInteracao) semInterPorVend.set(v.vendedorId, (semInterPorVend.get(v.vendedorId) ?? 0) + 1);
  const dif = r.total - anterior;

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Perdas · de ${fmtDate(ini)} a ${fmtDate(agora)}`}
        title={
          <>
            <Hl>{r.total} leads</Hl> perdidos. <Pill>{r.semInteracao.length}</Pill> <Capsule /> {r.semInteracao.length === 1 ? 'saiu' : 'saíram'} sem nenhuma interação.
          </>
        }
        aside={
          <>
            {dif === 0 ? 'O mesmo número' : `${Math.abs(dif)} ${dif > 0 ? 'a mais' : 'a menos'}`} que nos {dias} dias anteriores. O motivo vem da lista obrigatória do CRM, e o lead
            volta para a pré-vendas em Resgate ou Limbo.
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Por que perdemos" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {motivos.map(([id, n], i) => (
              <div key={id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{motivoNome(id)}</span>
                  <span className="text-muted-foreground">
                    <span className="num font-medium text-foreground">{n}</span> · {fmtPct(pct(n))}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-track">
                  <motion.div
                    className={i === 0 ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-ink'}
                    initial={{ width: 0 }}
                    animate={{ width: `${(n / maxMotivo) * 100}%` }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.05 }}
                  />
                </div>
                {id === 'sem_retorno' && semRetornoLentos > 0 && (
                  <span className="text-xs text-primary">
                    {semRetornoLentos} de {semRetorno} são de vendedores com menos de 50% de primeiro contato em até 1 hora.
                  </span>
                )}
              </div>
            ))}
            {motivos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma perda no período.</p>}
          </div>
          <Contexto
            className="text-muted-foreground opacity-100"
            itens={[`${fmtPct(pct(naNegociacao))} das perdas acontecem em Negociação, depois da demo`, `${(r.porEtapa.get('reagendar_demo') ?? 0) + (r.porEtapa.get('demo_agendada') ?? 0)} antes da demo`]}
          />
        </Bloco>

        <Stagger className="flex flex-col gap-4">
          <Bloco tom="ink" titulo="Para onde o lead vai">
            <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-white/15">
              {(
                [
                  ['resgate_sdr', resgate],
                  ['limbo_sdr', limbo],
                ] as const
              ).map(([e, n], i) => (
                <motion.div key={e} className="h-full" style={{ background: ETAPA_COR[e] }} initial={{ width: 0 }} animate={{ width: `${pct(n) ?? 0}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.1 }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ['resgate_sdr', resgate, 'Sem retorno, adiou ou não compareceu. O SDR tenta de novo.'],
                  ['limbo_sdr', limbo, 'Preço, outro sistema ou concorrente.'],
                ] as const
              ).map(([e, n, ajuda]) => (
                <div key={e} className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-xs opacity-70">
                    <Dot color={ETAPA_COR[e]} />
                    {ETAPA_LABEL[e]}
                  </span>
                  <span className="display num text-4xl">{n}</span>
                  <span className="text-xs leading-relaxed opacity-60">{ajuda}</span>
                </div>
              ))}
            </div>
          </Bloco>

          <Bloco tom={r.semInteracao.length ? "pink" : "white"} titulo="Perdidos sem interação">
            {r.semInteracao.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {[...semInterPorVend.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, n]) => (
                      <span key={id} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/15 pr-2.5 pl-1 text-xs">
                        <NameAvatar nome={nome(id)} size={20} />
                        {nome(id)} · {n}
                      </span>
                    ))}
                </div>
                <ul className="flex flex-col gap-1">
                  {r.semInteracao.slice(0, 4).map((v) => (
                    <li key={v.lead.id}>
                      <button type="button" onClick={() => abrirLead(v.lead.id)} className="text-left text-sm underline-offset-4 hover:underline">
                        {v.lead.contato} - {v.lead.revenda}
                      </button>
                    </li>
                  ))}
                </ul>
                <Contexto itens={['Com a trava da Fase 1, o CRM não deixa mover para Resgate ou Limbo sem ao menos uma interação.']} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Toda perda do período teve ao menos uma interação registrada.</p>
            )}
          </Bloco>
        </Stagger>
      </div>
    </Page>
  );
}
