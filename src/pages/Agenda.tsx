import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Origem } from '@/components/crm';
import { ArrowLink, Bloco, Capsule, Contexto, Hl, Intro, Medidor, Numero, Pilulas, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import type { LeadView } from '@/data/metrics/estado';
import { resumoDemos } from '@/data/metrics/indicadores';
import { DAY, fmtDate, fmtRelativeDay, fmtTime, HOUR, isBusinessDay, startOfDay, startOfWeek, weekdayShort } from '@/data/time';
import type { Demo } from '@/data/types';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Situacao = 'realizada' | 'faltou' | 'sem_desfecho' | 'agora' | 'agendada';

const SIT: Record<Situacao, { rotulo: string; cls: string }> = {
  realizada: { rotulo: 'Realizada', cls: 'border-ink bg-ink text-ink-foreground' },
  agora: { rotulo: 'Em andamento', cls: 'border-primary bg-primary text-white' },
  faltou: { rotulo: 'Não compareceu', cls: 'border-primary/40 text-primary' },
  sem_desfecho: { rotulo: 'Sem desfecho', cls: 'border-warning bg-warning/15 text-warning-foreground' },
  agendada: { rotulo: 'Agendada', cls: 'border-ink/15 text-muted-foreground' },
};

function situacao(d: Demo, agora: number): Situacao {
  if (d.status === 'realizada') return 'realizada';
  if (d.status === 'nao_compareceu') return 'faltou';
  if (d.agendadaPara > agora) return 'agendada';
  return agora - d.agendadaPara <= HOUR ? 'agora' : 'sem_desfecho';
}

export function Agenda() {
  const { views, agora, config, nome, abrirLead } = usePainel();
  const p = config.params;
  const hoje = startOfDay(agora);
  const [dia, setDia] = useState(String(hoje));

  const d = useMemo(() => {
    const todas: { d: Demo; v: LeadView }[] = [];
    for (const v of views) for (const dm of v.demos) todas.push({ d: dm, v });
    const doDia = (t: number) => todas.filter((x) => x.d.agendadaPara >= t && x.d.agendadaPara < t + DAY).sort((a, b) => a.d.agendadaPara - b.d.agendadaPara);
    const semana: number[] = [];
    for (let t = startOfWeek(agora); semana.length < 5; t += DAY) if (isBusinessDay(t, p)) semana.push(t);
    let proximo = hoje + DAY;
    while (!isBusinessDay(proximo, p)) proximo += DAY;
    if (!semana.includes(proximo)) semana.push(proximo);
    const iniSemana = startOfWeek(agora);
    const resumo = resumoDemos(views, agora, iniSemana, agora);
    const anterior = resumoDemos(views, agora, iniSemana - 7 * DAY, iniSemana);
    const semDesfecho = todas.filter((x) => situacao(x.d, agora) === 'sem_desfecho' && x.d.agendadaPara > agora - 7 * DAY).sort((a, b) => b.d.agendadaPara - a.d.agendadaPara);
    return { semana, doDia, resumo, anterior, semDesfecho };
  }, [views, agora, p, hoje]);

  const { semana, doDia, resumo, anterior, semDesfecho } = d;
  const hojeLista = doDia(hoje);
  const lista = doDia(Number(dia));
  const ehHoje = Number(dia) === hoje;
  const semDesfechoHoje = hojeLista.filter((x) => situacao(x.d, agora) === 'sem_desfecho').length;
  const idxAgora = ehHoje ? lista.findIndex((x) => x.d.agendadaPara > agora) : -1;
  const passadas = resumo.realizadas + resumo.faltaram;

  return (
    <Page className="gap-8">
      <Intro
        tag={`Agenda de demos · semana de ${fmtDate(startOfWeek(agora))}`}
        title={
          semDesfechoHoje > 0 ? (
            <>
              Hoje são <Hl>{hojeLista.length} demos</Hl>. <Pill>{semDesfechoHoje}</Pill> <Capsule /> {semDesfechoHoje === 1 ? 'está' : 'estão'} sem desfecho.
            </>
          ) : (
            <>
              Hoje são <Hl>{hojeLista.length} demos</Hl>, todas com <Pill>desfecho</Pill> <Capsule /> registrado.
            </>
          )
        }
        aside="Toda demo com horário passado precisa de desfecho em até 1 hora: realizada (vai para Negociação) ou não compareceu (vai para Reagendar Demonstração)."
      />

      <Pilulas
        id="dias"
        label="Dia"
        value={dia}
        onChange={setDia}
        options={semana.map((t) => [
          String(t),
          <>
            {t === hoje ? 'Hoje' : `${weekdayShort(t)} ${fmtDate(t).slice(0, 5)}`}
            <span className="num opacity-60">{doDia(t).length}</span>
          </>,
        ])}
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo={ehHoje ? 'Demos de hoje' : `Demos de ${weekdayShort(Number(dia)).toLowerCase()}, ${fmtDate(Number(dia))}`} className="gap-2 lg:col-span-2">
          <ul className="-mx-2 flex flex-col">
            {lista.map(({ d: dm, v }, i) => {
              const s = situacao(dm, agora);
              return (
                <motion.li key={dm.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.1 + i * 0.025 }}>
                  {i === idxAgora && <LinhaAgora agora={agora} />}
                  <button
                    type="button"
                    onClick={() => abrirLead(v.lead.id)}
                    className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="num text-sm text-muted-foreground">{fmtTime(dm.agendadaPara)}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {v.lead.contato} - {v.lead.revenda}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Origem canal={v.lead.canal} className="text-xs" /> · Resp: {nome(dm.vendedorId)}
                      </span>
                    </span>
                    <span className={cn('inline-flex h-7 items-center rounded-full border px-2.5 text-xs whitespace-nowrap', SIT[s].cls)}>{SIT[s].rotulo}</span>
                  </button>
                </motion.li>
              );
            })}
            {ehHoje && idxAgora === -1 && lista.length > 0 && <LinhaAgora agora={agora} />}
          </ul>
          {lista.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma demo neste dia.</p>}
        </Bloco>

        <Stagger className="flex flex-col gap-4">
          <Bloco tom="ink" onda titulo="Comparecimento da semana">
            <Numero value={resumo.comparecimentoPct} format={(v) => `${Math.round(v)}%`} unidade={`${resumo.realizadas} de ${passadas}`} />
            <Medidor tom="ink" pct={resumo.comparecimentoPct} />
            <Contexto itens={[`semana passada ${anterior.comparecimentoPct === null ? '—' : `${Math.round(anterior.comparecimentoPct)}%`}`, `${resumo.faltaram} não compareceram`]} />
          </Bloco>

          <Bloco tom={semDesfecho.length ? 'pink' : 'white'} titulo="Sem desfecho · 7 dias" acao={semDesfecho.length ? undefined : <ArrowLink to="/fila" label="Abrir fila" />}>
            <Numero value={semDesfecho.length} unidade={semDesfecho.length === 1 ? 'demo' : 'demos'} />
            {semDesfecho.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {semDesfecho.slice(0, 4).map(({ d: dm, v }) => (
                  <li key={dm.id}>
                    <button type="button" onClick={() => abrirLead(v.lead.id)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/12 px-3 py-2 text-left text-sm transition-colors hover:bg-white/20">
                      <span className="truncate">
                        {v.lead.contato} - {v.lead.revenda}
                      </span>
                      <span className="shrink-0 text-xs opacity-80">
                        {fmtRelativeDay(dm.agendadaPara, agora)} {fmtTime(dm.agendadaPara)} · {nome(dm.vendedorId)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Todas as demos passadas têm desfecho registrado.</p>
            )}
          </Bloco>
        </Stagger>
      </div>
    </Page>
  );
}

function LinhaAgora({ agora }: { agora: number }) {
  return (
    <div className="flex items-center gap-3 px-2 py-1" aria-label={`Agora, ${fmtTime(agora)}`}>
      <span className="num w-[52px] text-xs font-medium text-primary">{fmtTime(agora)}</span>
      <span className="h-px flex-1 bg-primary" />
      <span className="text-xs font-medium text-primary">agora</span>
    </div>
  );
}
