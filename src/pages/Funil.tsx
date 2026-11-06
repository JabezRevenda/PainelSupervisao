import { motion } from 'motion/react';
import { type ReactNode, useMemo } from 'react';
import { Bloco, Capsule, Contexto, fmtNum, fmtPct, Hl, Intro, Numero, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
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

      <Bloco titulo="Etapas do vendedor no CRM">
        <div className="flex flex-col">
          {etapas.map((e, i) => {
            const w = (e.n / base) * 100;
            const ant = anteriores[i];
            const ehPior = i === idxPior;
            const dif = e.conversao !== null && ant.conversao !== null ? e.conversao - ant.conversao : null;
            return (
              <div key={e.etapa} className="flex flex-col">
                {i > 0 && (
                  <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 py-3 pl-[212px] text-xs max-md:pl-0', ehPior ? 'text-primary' : 'text-muted-foreground')}>
                    <span className="font-medium">{fmtPct(e.conversao)} avançam</span>
                    <span>{etapas[i - 1].n - e.n} saem</span>
                    <span>{fmtNum(e.diasMedios, 1)} dias em média</span>
                    {dif !== null && (
                      <span>
                        {dif >= 0 ? '+' : '−'}
                        {fmtNum(Math.abs(dif), 1)} p.p. vs. {dias} dias antes
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-[200px_1fr] items-center gap-3 max-md:grid-cols-1">
                  <span className="text-sm font-medium">{FUNIL_LABEL[e.etapa]}</span>
                  <div className="relative h-12 overflow-hidden rounded-full bg-track">
                    <motion.div
                      className={cn('absolute inset-y-0 left-0 rounded-full', ehPior ? 'bg-primary' : 'bg-ink')}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(w, 6)}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.12 }}
                    />
                    <span className="num absolute inset-y-0 left-4 flex items-center text-base font-medium text-white">{e.n}</span>
                    <span className="num absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">{Math.round(w)}% do início</span>
                  </div>
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
