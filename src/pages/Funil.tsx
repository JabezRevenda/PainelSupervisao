import { motion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';
import { Bloco, Capsule, Contexto, fmtNum, fmtPct, Hl, Intro, Numero, Pill } from '@/components/kit';
import { AnimatedNumber, EASE, Page, Stagger } from '@/components/motion';
import { Wave } from '@/components/wave';
import { fechamento, funil } from '@/data/metrics/indicadores';
import { DAY, fmtDate } from '@/data/time';
import { FUNIL_LABEL } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

export function Funil({ dias, topo }: { dias: number; topo: ReactNode }) {
  const { views, agora } = usePainel();

  const d = useMemo(() => {
    const ini = agora - dias * DAY;
    const etapas = funil(views, ini, agora);
    const anteriores = funil(views, ini - dias * DAY, ini);
    const fech = fechamento(views, ini, agora);
    const fechAnt = fechamento(views, ini - dias * DAY, ini);
    const coorte = views.filter((v) => v.recebidoEm >= ini && v.recebidoEm < agora);
    const reagendou = coorte.filter((v) => v.atingiu.reagendar_demo !== undefined).length;
    return { ini, etapas, anteriores, fech, fechAnt, coorte: coorte.length, reagendou };
  }, [views, agora, dias]);

  const { ini, etapas, anteriores, fech, fechAnt, coorte, reagendou } = d;
  const base = etapas[0].n || 1;
  const transicoes = etapas.slice(1);
  const pior = [...transicoes].sort((a, b) => (a.conversao ?? 100) - (b.conversao ?? 100))[0];
  const idxPior = etapas.indexOf(pior);
  const difGanho = fech.taxaGanhoPct !== null && fechAnt.taxaGanhoPct !== null ? fech.taxaGanhoPct - fechAnt.taxaGanhoPct : null;

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Funil · leads recebidos de ${fmtDate(ini)} a ${fmtDate(agora)}`}
        title={
          <>
            A maior perda está entre <Pill>{FUNIL_LABEL[etapas[idxPior - 1].etapa]}</Pill> <Capsule /> e {FUNIL_LABEL[pior.etapa]}: <Hl>{fmtPct(100 - (pior.conversao ?? 0))}</Hl> não
            avançam.
          </>
        }
        aside={
          <>
            De {etapas[0].n} leads que chegaram ao vendedor, {etapas[etapas.length - 1].n} já foram cadastrados e {fech.emAberto} seguem em aberto. Quem não comparece à demo passa
            por Reagendar Demonstração.
          </>
        }
      />

      <Bloco titulo="Funil do vendedor no CRM">
        <p className="-mt-2 text-sm text-muted-foreground">A largura de cada faixa é proporcional ao número de leads que chegou à etapa.</p>
        <div className="flex flex-col gap-1.5">
          {etapas.map((e, i) => {
            const topoPct = (e.n / base) * 100;
            const prox = etapas[i + 1];
            const baixoPct = prox ? (prox.n / base) * 100 : topoPct * 0.72;
            const it = (100 - topoPct) / 2;
            const ib = (100 - baixoPct) / 2;
            const destaque = i === idxPior - 1;
            const ant = prox ? anteriores[i + 1] : null;
            const dif = prox && ant && prox.conversao !== null && ant.conversao !== null ? prox.conversao - ant.conversao : null;
            return (
              <div key={e.etapa} className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-x-4 md:gap-x-10">
                <motion.div
                  className={cn('relative isolate flex min-h-24 items-center justify-center self-stretch overflow-hidden', destaque ? 'bg-primary text-white' : 'bg-ink text-ink-foreground')}
                  initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
                  animate={{ clipPath: `polygon(${it}% 0%, ${100 - it}% 0%, ${100 - ib}% 100%, ${ib}% 100%)` }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.14 }}
                >
                  {destaque && <Wave className="absolute inset-0 -z-10 size-full text-white" opacidade={0.35} />}
                  <span className="display num text-3xl max-md:hidden">
                    <AnimatedNumber value={e.n} />
                  </span>
                </motion.div>
                <div className="flex flex-col gap-1">
                  <span className="eyebrow">{FUNIL_LABEL[e.etapa]}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="num font-medium text-foreground md:hidden">{e.n} · </span>
                    {i === 0 ? 'leads que chegaram ao vendedor' : `${Math.round(topoPct)}% dos que chegaram`}
                  </span>
                  {prox && (
                    <span className={cn('text-xs leading-relaxed', destaque ? 'font-medium text-primary' : 'text-muted-foreground')}>
                      ↓ {fmtPct(prox.conversao)} avançam · {e.n - prox.n} saem · {fmtNum(prox.diasMedios, 1)} dias
                      {dif !== null && (
                        <>
                          {' '}
                          · {dif >= 0 ? '+' : '−'}
                          {fmtNum(Math.abs(dif), 1)} p.p. vs. {dias} dias antes
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Bloco>

      <Stagger className="grid gap-4 md:grid-cols-3">
        <Bloco tom="ink" onda titulo="Taxa de ganho">
          <Numero value={fech.taxaGanhoPct} format={(v) => `${Math.round(v)}%`} unidade="dos encerrados" />
          <Contexto
            className="mt-auto"
            itens={[
              `${fech.ganhos} cadastrados, ${fech.perdidos} perdidos`,
              difGanho === null ? null : `${difGanho >= 0 ? '+' : '−'}${fmtNum(Math.abs(difGanho), 0)} p.p. vs. ${dias} dias antes`,
            ]}
          />
        </Bloco>
        <Bloco titulo="Ciclo de venda">
          <Numero value={fech.cicloMedianoDias} format={(v) => fmtNum(v, 1)} unidade="dias até o cadastro" />
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={['mediana', `média ${fmtNum(fech.cicloMedioDias, 1)} dias`, `${dias} dias antes: ${fmtNum(fechAnt.cicloMedianoDias, 1)}`]} />
        </Bloco>
        <Bloco titulo="Passaram por Reagendar">
          <Numero value={coorte ? (reagendou / coorte) * 100 : null} format={(v) => `${Math.round(v)}%`} unidade="dos leads" />
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[`${reagendou} de ${coorte} não compareceram à 1ª demo`]} />
        </Bloco>
      </Stagger>
    </Page>
  );
}
