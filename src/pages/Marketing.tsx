import { motion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';
import { Origem } from '@/components/crm';
import { Bloco, Capsule, Contexto, Dot, fmtNum, fmtPct, Hl, Intro, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { efeitoSla, porCanal } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { CANAL_LABEL } from '@/data/types';
import { usePainel } from '@/state/painel';

export function Marketing({ dias, topo }: { dias: number; topo: ReactNode }) {
  const { ds, views, agora, config } = usePainel();
  const p = config.params;

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    return { ini, canais: porCanal(views, ds, p, ini, agora), efeito: efeitoSla(views, ds, p, ini, agora) };
  }, [views, ds, p, agora, dias]);

  const { ini, canais, efeito } = d;
  const comLeads = canais.filter((c) => c.leads >= 10);
  const piorConv = [...comLeads].sort((a, b) => (a.conversaoPct ?? 0) - (b.conversaoPct ?? 0))[0];
  const avaliaveis = canais.filter((c) => c.noPrazo >= 5 && c.fora >= 5);
  const melhores = avaliaveis.filter((c) => (c.convNoPrazoPct ?? 0) > (c.convForaPct ?? 0)).length;
  const maxConv = Math.max(10, ...canais.flatMap((c) => [c.convNoPrazoPct ?? 0, c.convForaPct ?? 0]));
  const escala = Math.ceil(maxConv / 10) * 10;

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Origem do lead · recebidos de ${fmtDate(ini)} a ${fmtDate(agora)}`}
        title={
          <>
            Quem tem contato em até 1 hora converte <Hl>{efeito.multiplicador ? `${fmtNum(efeito.multiplicador, 1)}×` : '—'}</Hl> <Pill>mais</Pill> <Capsule />.
          </>
        }
        aside={
          <>
            Em {melhores} de {avaliaveis.length} origens com volume suficiente, o lead atendido no prazo converte mais. Antes de dizer que uma origem é ruim, veja se ela foi atendida
            no prazo.
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Conversão por origem" className="lg:col-span-2">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Dot color="var(--ink)" /> contato em até 1h
            </span>
            <span className="flex items-center gap-1.5">
              <Dot color="var(--primary)" /> contato fora do prazo
            </span>
            <span>Escala de 0 a {escala}%</span>
          </div>
          <div className="flex flex-col gap-5">
            {canais.map((c, i) => (
              <div key={c.canal} className="grid grid-cols-[150px_1fr] items-center gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col">
                  <Origem canal={c.canal} className="text-sm text-foreground" />
                  <span className="pl-4 text-xs text-muted-foreground">
                    {c.leads} leads · {fmtPct(c.slaPct)} no prazo
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      [c.convNoPrazoPct, c.noPrazo, 'bg-ink'],
                      [c.convForaPct, c.fora, 'bg-primary'],
                    ] as [number | null, number, string][]
                  ).map(([v, n, cor], j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-2.5 flex-1 rounded-full bg-track">
                        <motion.div
                          className={`h-full rounded-full ${cor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${n >= 5 ? ((v ?? 0) / escala) * 100 : 0}%` }}
                          transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.06 + j * 0.03 }}
                        />
                      </div>
                      <span className={`num w-20 text-right text-xs ${j === 0 ? 'font-medium' : 'text-muted-foreground'}`}>{n >= 5 ? fmtPct(v) : 'poucos leads'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Bloco>

        <Stagger className="flex flex-col gap-4">
          <Bloco tom="ink" onda titulo="Efeito do atendimento rápido">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs opacity-70">Em até 1h</span>
                <span className="display num text-4xl">{fmtPct(efeito.convDentro, 1)}</span>
                <span className="text-xs opacity-70">{efeito.dentro} leads</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs opacity-70">Fora do prazo</span>
                <span className="display num text-4xl text-primary">{fmtPct(efeito.convFora, 1)}</span>
                <span className="text-xs opacity-70">{efeito.fora} leads</span>
              </div>
            </div>
            <Contexto itens={['conversão em cadastro', `${efeito.dentroGanhos + efeito.foraGanhos} cadastros no período`]} />
          </Bloco>
          {piorConv && (
            <Bloco tom="pink" titulo="Leitura para o marketing">
              <p className="text-[15px] leading-relaxed">
                <span className="font-medium">{CANAL_LABEL[piorConv.canal]}</span> tem a menor conversão ({fmtPct(piorConv.conversaoPct)}), e {fmtPct(100 - (piorConv.slaPct ?? 0))} dos
                leads dessa origem esperaram mais de 1 hora pelo primeiro contato.
              </p>
              <p className="text-sm leading-relaxed text-white/85">Quando atendido no prazo, o lead de {CANAL_LABEL[piorConv.canal]} converte {fmtPct(piorConv.convNoPrazoPct)}.</p>
            </Bloco>
          )}
        </Stagger>
      </div>
    </Page>
  );
}
