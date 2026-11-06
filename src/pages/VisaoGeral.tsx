import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLink, Bloco, Capsule, Chip, Contexto, Cta, Dot, fmtNum, fmtPct, Hl, Intro, Medidor, NameAvatar, Numero, Pill } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { carteira, fila, metasDoMes, resumoAtendimento, resumoDemos, urgente } from '@/data/metrics/indicadores';
import { linhasVendedores, STATUS_VENDEDOR } from '@/data/metrics/vendedores';
import { DAY, fmtLongDate, HOUR, minutesOfDay, monthName, startOfDay } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

function saudacao(agora: number) {
  const m = minutesOfDay(agora);
  return m < 12 * 60 ? 'Bom dia' : m < 18 * 60 ? 'Boa tarde' : 'Boa noite';
}

export function VisaoGeral() {
  const { ds, views, agora, config, vendedores, metas, okrs } = usePainel();
  const p = config.params;
  const navigate = useNavigate();

  const d = useMemo(() => {
    const cart = carteira(views, agora, p);
    const mes = metasDoMes(
      views,
      agora,
      p,
      metas,
      vendedores.map((v) => v.id),
    );
    const r30 = resumoAtendimento(views, ds, p, agora - 30 * DAY, agora);
    const r60 = resumoAtendimento(views, ds, p, agora - 60 * DAY, agora - 30 * DAY);
    const linhas = linhasVendedores(views, ds, p, agora, vendedores, metas);
    const hoje = startOfDay(agora);
    const demos = { realizadas: 0, faltaram: 0, semDesfecho: 0, aSeguir: 0 };
    for (const v of views)
      for (const dm of v.demos) {
        if (dm.agendadaPara < hoje || dm.agendadaPara >= hoje + DAY) continue;
        if (dm.status === 'realizada') demos.realizadas++;
        else if (dm.status === 'nao_compareceu') demos.faltaram++;
        else if (dm.agendadaPara + HOUR < agora) demos.semDesfecho++;
        else demos.aSeguir++;
      }
    const comp30 = resumoDemos(views, agora, agora - 30 * DAY, agora).comparecimentoPct;
    const acao = fila(views, agora, p).filter(urgente).length;
    return { cart, mes, r30, r60, linhas, demos, comp30, acao };
  }, [views, ds, agora, p, vendedores, metas]);

  const { cart, mes, r30, r60, linhas, demos, comp30, acao } = d;
  const krs = okrs.flatMap((o) => o.resultados);
  const metaSla = krs.find((k) => k.indicador === 'sla_1h')?.alvo ?? 85;
  const metaParados = krs.find((k) => k.indicador === 'parados_agora')?.alvo ?? 3;
  const porParados = linhas.filter((l) => l.parados > 0).sort((a, b) => b.parados - a.parados);
  const porSemContato = linhas.filter((l) => l.semContato > 0).sort((a, b) => b.semContato - a.semContato);
  const ordenados = [...linhas].sort((a, b) => b.parados + b.semContato - (a.parados + a.semContato) || (a.sla ?? 0) - (b.sla ?? 0));
  const esperado = mes.diasTotal ? (mes.diasPassados / mes.diasTotal) * 100 : 0;
  const totalDemos = demos.realizadas + demos.faltaram + demos.semDesfecho + demos.aSeguir;
  const difSla = r30.slaPct !== null && r60.slaPct !== null ? r30.slaPct - r60.slaPct : null;

  return (
    <Page className="gap-8">
      <Intro
        tag={`Hoje · ${fmtLongDate(agora)}`}
        title={
          acao > 0 ? (
            <>
              {saudacao(agora)}. <Hl>{acao} leads</Hl> pedem <Pill>ação</Pill> <Capsule /> agora.
            </>
          ) : (
            <>
              {saudacao(agora)}. Nenhum lead <Pill>esquecido</Pill> <Capsule /> agora.
            </>
          )
        }
        aside={
          <>
            São {cart.parados} parados há mais de {p.paradoHoras}h e {cart.slaEstourado} sem primeiro contato depois do prazo de 1 hora útil. Comece por eles: são os que mais
            esfriam.
          </>
        }
        action={<Cta to="/fila">Abrir fila de risco</Cta>}
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Bloco tom={cart.parados > 0 ? 'pink' : 'white'} onda={cart.parados > 0} titulo={`Parados há +${p.paradoHoras}h`} acao={<ArrowLink to="/fila" label="Ver parados na fila" tom={cart.parados > 0 ? 'pink' : 'white'} />}>
          <Numero value={cart.parados} unidade={cart.parados === 1 ? 'lead' : 'leads'} />
          <div className="flex flex-wrap gap-1.5">
            {porParados.slice(0, 4).map((l) => (
              <Chip key={l.id}>
                {l.nome} · {l.parados}
              </Chip>
            ))}
          </div>
          <Contexto className="mt-auto" itens={[`meta do trimestre: até ${metaParados}`, cart.viramParadosHoje > 0 && `${cart.viramParadosHoje} viram parados até as ${p.fimMin / 60}h`]} />
        </Bloco>

        <Bloco titulo="Sem primeiro contato" acao={<ArrowLink to="/fila" label="Ver sem contato na fila" />}>
          <Numero value={cart.semContato} unidade={cart.semContato === 1 ? 'lead' : 'leads'} />
          <div className="flex flex-wrap gap-1.5">
            {porSemContato.slice(0, 4).map((l) => (
              <Chip key={l.id}>
                {l.nome} · {l.semContato}
              </Chip>
            ))}
            {porSemContato.length === 0 && <Chip>Todos atendidos</Chip>}
          </div>
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[<span className={cart.slaEstourado ? 'font-medium text-primary' : ''}>{cart.slaEstourado} com prazo estourado</span>, 'prazo: 1 hora útil']} />
        </Bloco>

        <Bloco titulo="1º contato em até 1h" acao={<ArrowLink to="/time" label="Ver por vendedor" />}>
          <Numero value={r30.slaPct} format={(v) => `${Math.round(v)}%`} unidade="últimos 30 dias" className={cn((r30.slaPct ?? 0) < metaSla && 'text-primary')} />
          <Medidor pct={r30.slaPct} marca={metaSla} />
          <Contexto
            className="mt-auto text-muted-foreground opacity-100"
            itens={[
              `meta ${metaSla}%`,
              difSla === null ? null : (
                <span className={difSla < 0 ? 'text-primary' : ''}>
                  {difSla >= 0 ? '+' : '−'}
                  {fmtNum(Math.abs(difSla), 0)} p.p. vs. 30 dias antes
                </span>
              ),
            ]}
          />
        </Bloco>

        <Bloco tom="ink" onda titulo={`Meta de ${monthName(agora)}`} acao={<ArrowLink to="/metas" label="Ver metas" tom="ink" />}>
          <Numero value={mes.ganhos} unidade={`de ${mes.meta} cadastros`} />
          <Medidor tom="ink" pct={mes.meta ? (mes.ganhos / mes.meta) * 100 : 0} marca={esperado} />
          <Contexto
            className="mt-auto"
            itens={[
              <span className={mes.projecao < mes.meta ? 'font-medium text-primary' : ''}>projeção {mes.projecao}</span>,
              `faltam ${mes.faltam} em ${mes.diasRestantes} dias úteis`,
            ]}
          />
        </Bloco>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Vendedores agora" acao={<ArrowLink to="/time" label="Abrir Time" />} className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-2 pb-2 font-normal">Vendedor</th>
                  <th className="px-2 pb-2 text-right font-normal">Sem contato</th>
                  <th className="px-2 pb-2 text-right font-normal">Parados</th>
                  <th className="w-[34%] px-2 pb-2 font-normal">1º contato em 1h · 30 dias</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((l, i) => (
                  <motion.tr
                    key={l.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: 0.2 + i * 0.03 }}
                    onClick={() => navigate(`/time?v=${l.id}`)}
                    className="cursor-pointer border-t transition-colors hover:bg-muted/60"
                  >
                    <td className="px-2 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <NameAvatar nome={l.nome} size={28} />
                        <span className="flex flex-col leading-tight">
                          <span className="font-medium">{l.nome}</span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Dot color={STATUS_VENDEDOR[l.status].cor} className="size-1.5" />
                            {STATUS_VENDEDOR[l.status].rotulo}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={cn('num px-2 text-right', l.semContato ? 'font-medium text-primary' : 'text-muted-foreground')}>{l.semContato}</td>
                    <td className={cn('num px-2 text-right', l.parados ? 'font-medium text-primary' : 'text-muted-foreground')}>{l.parados}</td>
                    <td className="px-2">
                      <span className="flex items-center gap-3">
                        <Medidor pct={l.sla} marca={metaSla} delay={0.25 + i * 0.03} className="h-1.5" />
                        <span className={cn('num w-10 text-right', (l.sla ?? 0) < 50 && 'text-primary')}>{fmtPct(l.sla)}</span>
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">A linha rosa na barra é a meta de {metaSla}%. Clique em um vendedor para ver o detalhe.</p>
        </Bloco>

        <Bloco titulo="Demos de hoje" acao={<ArrowLink to="/agenda" label="Abrir agenda" />}>
          <Numero value={totalDemos} unidade="agendadas" />
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-track">
            {(
              [
                [demos.realizadas, 'var(--ink)'],
                [demos.faltaram, 'var(--primary)'],
                [demos.semDesfecho, 'var(--warning)'],
              ] as [number, string][]
            ).map(([n, cor], i) => (
              <motion.div key={i} className="h-full" style={{ background: cor }} initial={{ width: 0 }} animate={{ width: `${totalDemos ? (n / totalDemos) * 100 : 0}%` }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.1 }} />
            ))}
          </div>
          <ul className="flex flex-col gap-2.5 text-sm">
            {(
              [
                ['Realizadas', demos.realizadas, 'var(--ink)'],
                ['Não compareceram', demos.faltaram, 'var(--primary)'],
                ['Sem desfecho', demos.semDesfecho, 'var(--warning)'],
                ['A seguir', demos.aSeguir, 'var(--track)'],
              ] as [string, number, string][]
            ).map(([rot, n, cor]) => (
              <li key={rot} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Dot color={cor} />
                  {rot}
                </span>
                <span className="num font-medium">{n}</span>
              </li>
            ))}
          </ul>
          <Contexto
            className="mt-auto text-muted-foreground opacity-100"
            itens={[
              `comparecimento hoje ${fmtPct(demos.realizadas + demos.faltaram ? (demos.realizadas / (demos.realizadas + demos.faltaram)) * 100 : null)}`,
              `30 dias: ${fmtPct(comp30)}`,
            ]}
          />
        </Bloco>
      </Stagger>
    </Page>
  );
}
