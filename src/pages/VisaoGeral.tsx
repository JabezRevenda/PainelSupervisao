import { ArrowRight, Clock, MessageCircle, Timer, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gauge, StackedColumns } from '@/components/charts';
import { Etiqueta, etiquetaDoAlerta } from '@/components/crm';
import { Delta, Dot, fmtNum, fmtPct, NameAvatar, PageHeader, StatCard, Strong } from '@/components/kit';
import { AnimatedNumber, EASE, GrowBar, Page, Reveal, Segmented, Stagger, itemVariants } from '@/components/motion';
import { carteira, fila, metasDoMes, resumoAtendimento, serieDiaria } from '@/data/metrics/indicadores';
import { DAY, fmtDate, fmtHours, fmtMinutes, HOUR, isBusinessDay, minutesOfDay, monthName, startOfDay } from '@/data/time';
import { ETAPA_COR, ETAPA_LABEL } from '@/data/types';
import { usePainel } from '@/state/painel';

type Periodo = 'hoje' | '7d' | '30d';

function saudacao(agora: number) {
  const m = minutesOfDay(agora);
  return m < 12 * 60 ? 'Bom dia' : m < 18 * 60 ? 'Boa tarde' : 'Boa noite';
}

export function VisaoGeral() {
  const { ds, views, agora, config, vendedores, metas, nome, abrirLead } = usePainel();
  const p = config.params;
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  const d = useMemo(() => {
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
    const serie15 = serieDiaria(views, ds, p, 15);
    const r30 = resumoAtendimento(views, ds, p, agora - 30 * DAY, agora);
    const itensFila = fila(views, agora, p).filter((x) => x.alertas[0].gravidade <= 5);
    const ranking = ids
      .map((id) => ({
        id,
        ganhos: mes.porVendedor.find((x) => x.id === id)?.ganhos ?? 0,
        sla: resumoAtendimento(views, ds, p, agora - 30 * DAY, agora, id).slaPct ?? 0,
      }))
      .sort((a, b) => b.ganhos - a.ganhos || b.sla - a.sla);
    const baixoUso = ids.filter((id) => (resumoAtendimento(views, ds, p, agora - 30 * DAY, agora, id).usoWhatsappCrmPct ?? 0) < 10);
    let realizadas = 0, emAndamento = 0, faltaram = 0, semDesfecho = 0, aSeguir = 0;
    for (const v of views)
      for (const dm of v.demos) {
        if (dm.agendadaPara < hoje || dm.agendadaPara >= hoje + DAY) continue;
        if (dm.status === 'realizada') realizadas++;
        else if (dm.status === 'nao_compareceu') faltaram++;
        else if (dm.agendadaPara > agora) aSeguir++;
        else if (agora - dm.agendadaPara <= HOUR) emAndamento++;
        else semDesfecho++;
      }
    const demos = { realizadas, emAndamento, faltaram, semDesfecho, aSeguir, total: realizadas + emAndamento + faltaram + semDesfecho + aSeguir };
    return { cart, mes, atual, prev, serie, serie15, r30, itensFila, ranking, baixoUso, demos };
  }, [views, ds, agora, p, periodo, vendedores, metas]);

  const { cart, mes, atual, prev, serie, serie15, r30, itensFila, ranking, baixoUso, demos } = d;
  const dif = mes.projecao - mes.meta;
  const rot = periodo === 'hoje' ? 'vs. dia útil anterior' : periodo === '7d' ? 'vs. 7 dias anteriores' : 'vs. 30 dias anteriores';
  const noPrazo15 = serie15.reduce((s, x) => s + x.noPrazo, 0);
  const fora15 = serie15.reduce((s, x) => s + x.fora, 0);
  const total15 = serie15.reduce((s, x) => s + x.recebidos, 0);

  const linhasCarteira = [
    { rotulo: 'Parados', ajuda: `mais de ${p.paradoHoras}h sem interação`, n: cart.parados, cor: 'var(--primary)' },
    { rotulo: 'Sem primeiro contato', ajuda: `${cart.slaEstourado} com o prazo de 1 hora estourado`, n: cart.semContato, cor: 'var(--primary)' },
    { rotulo: 'Em atenção', ajuda: `de ${p.atencaoHoras}h a ${p.paradoHoras}h sem interação`, n: cart.atencao, cor: 'var(--warning)' },
    { rotulo: 'Passo vencido', ajuda: 'próxima ação com data passada', n: cart.passoVencido, cor: 'var(--warning)' },
    { rotulo: 'Sem próximo passo', ajuda: 'nenhuma ação agendada', n: cart.semProximoPasso, cor: 'var(--chart-2)' },
  ];

  return (
    <Page>
      <PageHeader
        title="Visão geral"
        description={
          <>
            {saudacao(agora)}. Agora <Strong tone="primary">{cart.parados} leads estão parados</Strong> e <Strong tone="primary">{cart.semContato}</Strong> esperam o
            primeiro contato. São <Strong>{cart.abertos} leads abertos</Strong> com {vendedores.length} vendedores. No ritmo atual, {monthName(agora)} fecha com{' '}
            <Strong>{mes.projecao} contratos</Strong>, {dif === 0 ? 'exatamente na meta' : `${Math.abs(dif)} ${dif > 0 ? 'acima' : 'abaixo'} da meta de ${mes.meta}`}.
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/kanban">Abrir Kanban</Link>
            </Button>
            <Button asChild>
              <Link to="/fila">
                Fila de risco <ArrowRight />
              </Link>
            </Button>
          </>
        }
      />

      <Reveal className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium">Atendimento</h2>
        <Segmented id="periodo" label="Período" value={periodo} onChange={setPeriodo} options={[['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias']]} />
      </Reveal>

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Leads recebidos',
            value: atual.recebidos,
            icon: <Users />,
            spark: serie.map((x) => x.recebidos),
            delta: <Delta v={prev.recebidos ? ((atual.recebidos - prev.recebidos) / prev.recebidos) * 100 : null} unidade="%" sufixo={rot} neutro />,
          },
          {
            label: 'Primeiro contato em até 1 hora útil',
            value: atual.slaPct,
            format: (v: number) => `${Math.round(v)}%`,
            sufixo: 'meta 85%',
            icon: <Clock />,
            spark: serie.map((x) => (x.noPrazo + x.fora ? (x.noPrazo / (x.noPrazo + x.fora)) * 100 : 0)),
            delta: <Delta v={atual.slaPct !== null && prev.slaPct !== null ? atual.slaPct - prev.slaPct : null} sufixo={rot} />,
          },
          {
            label: 'Tempo mediano até o 1º contato',
            value: atual.medianaPrimeiroContatoMin,
            format: (v: number) => fmtMinutes(v),
            icon: <Timer />,
            spark: serie.map((x) => x.medianaMin ?? 0),
            delta: (
              <Delta
                v={atual.medianaPrimeiroContatoMin !== null && prev.medianaPrimeiroContatoMin !== null ? atual.medianaPrimeiroContatoMin - prev.medianaPrimeiroContatoMin : null}
                unidade="min"
                invert
                sufixo={rot}
              />
            ),
          },
          {
            label: 'Interações registradas no CRM',
            value: atual.interacoes,
            sufixo: atual.interacoesPorLead ? `${fmtNum(atual.interacoesPorLead, 1)} por lead` : undefined,
            icon: <MessageCircle />,
            spark: serie.map((x) => x.interacoes),
            delta: <Delta v={prev.interacoes ? ((atual.interacoes - prev.interacoes) / prev.interacoes) * 100 : null} unidade="%" sufixo={rot} />,
          },
        ].map((k) => (
          <motion.div key={k.label} variants={itemVariants}>
            <StatCard {...k} className="h-full" />
          </motion.div>
        ))}
      </Stagger>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Meta de {monthName(agora)}</CardTitle>
            <CardDescription>Contratos cadastrados (assinados e pagos)</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/metas">Detalhes</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <div className="relative w-full">
              <Gauge pct={mes.projecaoPct ?? 0} label={`Projeção de ${fmtPct(mes.projecaoPct)} da meta`} />
              <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
                <span className="text-4xl font-semibold tracking-tight">
                  <AnimatedNumber value={mes.projecaoPct ?? 0} format={(v) => `${Math.round(v)}%`} />
                </span>
                <span className="text-xs text-muted-foreground">da meta no ritmo atual</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 divide-x rounded-lg border text-center">
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="text-xs text-muted-foreground">Cadastrados</span>
                <span className="num text-lg font-semibold">
                  {mes.ganhos}
                  <span className="text-sm font-normal text-muted-foreground">/{mes.meta}</span>
                </span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="text-xs text-muted-foreground">Projeção</span>
                <span className="num text-lg font-semibold">{mes.projecao}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2.5">
                <span className="text-xs text-muted-foreground">Dias úteis</span>
                <span className="num text-lg font-semibold">
                  {fmtNum(mes.diasPassados, 0)}
                  <span className="text-sm font-normal text-muted-foreground">/{mes.diasTotal}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carteira agora</CardTitle>
            <CardDescription>{cart.abertos} leads abertos com os vendedores</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/fila">Ver fila</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {linhasCarteira.map((l, i) => (
              <div key={l.rotulo} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm" title={l.ajuda}>
                  <span className="flex items-center gap-2">
                    <Dot color={l.cor} />
                    {l.rotulo}
                  </span>
                  <AnimatedNumber value={l.n} className="font-semibold" />
                </div>
                <GrowBar pct={cart.abertos ? (l.n / cart.abertos) * 100 : 0} color={l.cor} delay={0.1 + i * 0.05} />
              </div>
            ))}
            {cart.viramParadosHoje > 0 && (
              <p className="text-xs text-warning-foreground">{cart.viramParadosHoje} em atenção viram parados antes das 18h se ninguém falar com eles.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demos de hoje</CardTitle>
            <CardDescription>{demos.total} demonstrações agendadas</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agenda">Agenda</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {(
                [
                  [demos.realizadas, 'var(--primary)'],
                  [demos.emAndamento, 'var(--chart-4)'],
                  [demos.semDesfecho, 'var(--warning)'],
                  [demos.faltaram, 'var(--chart-2)'],
                  [demos.aSeguir, 'var(--muted)'],
                ] as [number, string][]
              ).map(([n, c], i) =>
                n > 0 ? (
                  <motion.span
                    key={i}
                    className="h-full"
                    style={{ background: c }}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: n }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.05 }}
                  />
                ) : null,
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {(
                [
                  ['Realizadas', demos.realizadas, 'var(--primary)'],
                  ['Em andamento', demos.emAndamento, 'var(--chart-4)'],
                  ['Sem desfecho', demos.semDesfecho, 'var(--warning)'],
                  ['Faltaram', demos.faltaram, 'var(--chart-2)'],
                  ['A seguir', demos.aSeguir, 'var(--muted-foreground)'],
                ] as [string, number, string][]
              ).map(([r, n, c]) => (
                <div key={r} className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Dot color={c} />
                    {r}
                  </dt>
                  <dd className="num font-medium">{n}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leads recebidos por dia</CardTitle>
            <CardDescription>Primeiro contato dentro e fora de 1 hora útil · últimos 15 dias úteis</CardDescription>
            <CardAction className="hidden gap-3 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <Dot color="var(--primary)" />
                No prazo
              </span>
              <span className="flex items-center gap-1.5">
                <Dot color="var(--chart-2)" />
                Fora
              </span>
              <span className="flex items-center gap-1.5">
                <Dot color="var(--warning)" />
                Correndo
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <StackedColumns
              ariaLabel={`Leads por dia: ${noPrazo15} no prazo e ${fora15} fora do prazo`}
              cols={serie15.map((x, i) => ({
                rotulo: i === serie15.length - 1 ? 'Hoje' : fmtDate(x.dia),
                dica: `${fmtDate(x.dia)}: ${x.recebidos} leads, ${x.noPrazo} no prazo`,
                destaque: i === serie15.length - 1,
                partes: [
                  { valor: x.noPrazo, cor: 'var(--primary)' },
                  { valor: x.correndo, cor: 'var(--warning)' },
                  { valor: x.fora, cor: 'var(--chart-2)' },
                ],
              }))}
            />
            <p className="text-sm text-muted-foreground">
              <Strong>{total15} leads</Strong> no período · <Strong tone="primary">{fmtPct(noPrazo15 + fora15 ? (noPrazo15 / (noPrazo15 + fora15)) * 100 : null)} no prazo</Strong> · meta 85%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking de {monthName(agora)}</CardTitle>
            <CardDescription>Cadastrados no mês e SLA de 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {ranking.slice(0, 6).map((r, i) => (
              <motion.div
                key={r.id}
                layout
                className="flex items-center gap-3 border-b py-2.5 last:border-0"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: 0.2 + i * 0.05 }}
              >
                <span className="num w-5 text-sm text-muted-foreground">{i + 1}</span>
                <NameAvatar nome={nome(r.id)} size={28} />
                <span className="flex-1 text-sm font-medium">{nome(r.id)}</span>
                <span className="num w-8 text-right text-sm font-semibold">{r.ganhos}</span>
                <span className="num w-10 text-right text-xs text-muted-foreground">{fmtPct(r.sla)}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-4">
            <CardTitle>Fila de risco</CardTitle>
            <CardDescription>
              {Math.min(6, itensFila.length)} de {itensFila.length} leads que pedem ação, do mais grave para o menos grave
            </CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link to="/fila">
                  Ver todos <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Lead</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Sem interação</TableHead>
                <TableHead className="pr-4">Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensFila.slice(0, 6).map(({ view: v, alertas: al }) => {
                const e = etiquetaDoAlerta(al[0], v, agora);
                return (
                  <TableRow key={v.lead.id} className="cursor-pointer" onClick={() => abrirLead(v.lead.id)}>
                    <TableCell className="pl-4">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {v.lead.contato} - {v.lead.revenda}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {v.lead.cidade}/{v.lead.uf}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{nome(v.vendedorId)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Dot color={ETAPA_COR[v.etapa]} />
                        {ETAPA_LABEL[v.etapa]}
                      </span>
                    </TableCell>
                    <TableCell className="num text-right">{fmtHours(v.horasSemInteracao)}</TableCell>
                    <TableCell className="pr-4">{e && <Etiqueta cor={e.cor}>{e.texto}</Etiqueta>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Reveal>

      {baixoUso.length > 0 && (
        <Reveal>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm">
            <MessageCircle className="size-4 text-muted-foreground" />
            <p className="flex-1 text-muted-foreground">
              <Strong>{fmtPct(r30.usoWhatsappCrmPct)} das mensagens</Strong> saíram pelo WhatsApp do CRM nos últimos 30 dias. Cada envio por ali entra no painel sem registro
              manual. {baixoUso.map(nome).join(', ')} {baixoUso.length === 1 ? 'está' : 'estão'} abaixo de 10%.
            </p>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/performance">Ver por vendedor</Link>
            </Button>
          </div>
        </Reveal>
      )}
    </Page>
  );
}
