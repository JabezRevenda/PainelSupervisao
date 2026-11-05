import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gauge } from '@/components/charts';
import { fmtNum, fmtPct, NameAvatar, PageHeader, StatCard, Strong } from '@/components/kit';
import { AnimatedNumber, EASE, GrowBar, Page, Reveal, Stagger, itemVariants } from '@/components/motion';
import { metasDoMes } from '@/data/metrics/indicadores';
import { progresso, valorIndicador } from '@/data/metrics/okr';
import { DAY, fmtDate, monthName, startOfQuarter, wall } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

function fmtValor(v: number | null, unidade: '%' | '') {
  if (v === null) return '—';
  return unidade === '%' ? fmtPct(v) : fmtNum(v);
}

type Status = 'ok' | 'atras' | 'risco' | 'sem';

const STATUS: Record<Status, { rotulo: string; badge: string; cor: string }> = {
  ok: { rotulo: 'No caminho', badge: 'border-success/30 bg-success/10 text-success', cor: 'var(--success)' },
  atras: { rotulo: 'Um pouco atrás', badge: 'border-warning/40 bg-warning/15 text-warning-foreground', cor: 'var(--warning)' },
  risco: { rotulo: 'Em risco', badge: 'border-primary/30 bg-primary/10 text-primary', cor: 'var(--primary)' },
  sem: { rotulo: 'Sem linha de base', badge: 'text-muted-foreground', cor: 'var(--muted-foreground)' },
};

export function Metas() {
  const { ds, views, dsBase, viewsBase, agora, config, vendedores, metas, okrs, nome } = usePainel();
  const p = config.params;
  const ids = vendedores.map((v) => v.id);
  const chaveIds = ids.join();

  const mes = useMemo(() => metasDoMes(views, agora, p, metas, ids), [views, agora, p, metas, chaveIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const iniTri = startOfQuarter(agora);
  const fimTri = startOfQuarter(iniTri + 100 * DAY);
  const triPct = ((agora - iniTri) / (fimTri - iniTri)) * 100;
  const trimestre = `${Math.floor(wall(agora).getUTCMonth() / 3) + 1}º trimestre de ${wall(agora).getUTCFullYear()}`;

  const krs = useMemo(() => {
    const ctx = { views, ds, p, metas, vendedores: ids };
    const ctxBase = dsBase ? { views: viewsBase, ds: dsBase, p, metas, vendedores: ids } : null;
    return okrs.map((o) => {
      const resultados = o.resultados.map((kr) => {
        const atual = valorIndicador(kr.indicador, ctx);
        const base = ctxBase ? valorIndicador(kr.indicador, ctxBase, true) : null;
        const prog = progresso(kr, base, atual);
        const status: Status = prog === null ? 'sem' : prog >= triPct - 5 ? 'ok' : prog >= triPct - 25 ? 'atras' : 'risco';
        return { kr, atual, base, prog, status };
      });
      const ps = resultados.map((r) => r.prog).filter((x): x is number => x !== null);
      return { o, resultados, media: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null };
    });
  }, [okrs, views, ds, dsBase, viewsBase, p, metas, chaveIds, triPct]); // eslint-disable-line react-hooks/exhaustive-deps

  const esperadoAteHoje = (meta: number) => (meta * mes.diasPassados) / Math.max(mes.diasTotal, 1);
  const mesNome = monthName(agora);

  return (
    <Page>
      <PageHeader
        title="Metas e OKRs"
        description={
          mes.faltam > 0 ? (
            <>
              Faltam <Strong tone="primary">{mes.faltam} cadastros</Strong> para a meta de {mesNome}. Restam {fmtNum(mes.diasRestantes, 0)} dias úteis. A venda conta no mês em que o
              vendedor move o lead para Cadastrado, com contrato assinado e pago.
            </>
          ) : (
            <>
              A meta de {mesNome} já foi batida: <Strong tone="primary">{mes.ganhos} cadastros</Strong> de {mes.meta}.
            </>
          )
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/configuracoes">Editar metas</Link>
          </Button>
        }
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: 'Cadastrados no mês', value: mes.ganhos, sufixo: `de ${mes.meta}`, delta: <span className="text-muted-foreground">{mes.ganhosMesAnterior} em {monthName(mes.ini - DAY)}</span> },
          {
            label: 'Dias úteis',
            value: mes.diasPassados,
            sufixo: `de ${mes.diasTotal}`,
            delta: <GrowBar pct={(mes.diasPassados / Math.max(mes.diasTotal, 1)) * 100} color="var(--muted-foreground)" />,
          },
          { label: 'Ritmo atual', value: mes.ritmoAtual, format: (v: number) => fmtNum(v, 1), sufixo: 'por dia útil', delta: <span className="text-muted-foreground">cadastros por dia útil até hoje</span> },
          {
            label: 'Ritmo necessário',
            value: mes.ritmoNecessario,
            format: (v: number) => fmtNum(v, 1),
            sufixo: 'por dia útil',
            delta:
              mes.ritmoNecessario !== null && mes.ritmoNecessario > mes.ritmoAtual ? (
                <span className="text-primary">{fmtNum(mes.ritmoNecessario - mes.ritmoAtual, 1)} acima do ritmo atual</span>
              ) : (
                <span className="text-muted-foreground">o ritmo atual já basta</span>
              ),
          },
        ].map((k) => (
          <motion.div key={k.label} variants={itemVariants}>
            <StatCard {...k} className="h-full" />
          </motion.div>
        ))}
      </Stagger>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Projeção do mês</CardTitle>
            <CardDescription>No ritmo atual, combinado com o ritmo de {monthName(mes.ini - DAY)} nos primeiros dias</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-center gap-5">
            <div className="relative">
              <Gauge pct={mes.projecaoPct ?? 0} label={`Projeção de ${fmtPct(mes.projecaoPct)} da meta`} />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                <AnimatedNumber value={mes.projecaoPct ?? 0} format={(v) => `${Math.round(v)}%`} className="text-4xl font-semibold tracking-tight" />
                <span className="text-xs text-muted-foreground">da meta</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x rounded-lg border text-center">
              <div className="flex flex-col gap-0.5 p-3">
                <span className="text-xs text-muted-foreground">Meta</span>
                <span className="num text-xl font-semibold">{mes.meta}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-3">
                <span className="text-xs text-muted-foreground">Projeção</span>
                <span className={cn('num text-xl font-semibold', mes.projecao < mes.meta && 'text-primary')}>{mes.projecao}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 pb-0 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Meta por vendedor · {mesNome}</CardTitle>
            <CardDescription>Cada quadrado é um cadastro da meta. A linha mostra onde o vendedor deveria estar hoje.</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="w-[45%]">Cadastros</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead className="pr-4">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mes.porVendedor.map((x, ri) => {
                const esperado = esperadoAteHoje(x.meta);
                const [rotulo, cor] =
                  x.meta > 0 && x.ganhos >= x.meta
                    ? ['Meta batida', 'text-success']
                    : x.ganhos >= esperado + 0.5
                      ? ['Acima do ritmo', 'text-success']
                      : x.ganhos >= esperado - 0.5
                        ? ['No ritmo', 'text-foreground']
                        : x.ganhos === 0
                          ? ['Sem cadastro no mês', 'text-warning-foreground']
                          : ['Abaixo do ritmo', 'text-warning-foreground'];
                const slots = Math.max(x.meta, x.ganhos, 1);
                return (
                  <TableRow key={x.id}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <NameAvatar nome={nome(x.id)} size={26} />
                        {nome(x.id)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
                        {Array.from({ length: slots }, (_, i) => (
                          <span key={i} className="relative h-3 overflow-hidden rounded-[3px] bg-muted">
                            {i < x.ganhos && (
                              <motion.span
                                className="absolute inset-0 origin-left rounded-[3px] bg-primary"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.35, ease: EASE, delay: 0.15 + ri * 0.04 + i * 0.05 }}
                              />
                            )}
                          </span>
                        ))}
                        <motion.span
                          aria-hidden="true"
                          title="Onde deveria estar hoje"
                          className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: 0.5 + ri * 0.04 }}
                          style={{ left: `calc(${Math.min((esperado / slots) * 100, 100)}% - 1px)` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="num text-right">
                      <span className="font-medium">{x.ganhos}</span> <span className="text-muted-foreground">de {x.meta}</span>
                    </TableCell>
                    <TableCell className={cn('pr-4 text-sm font-medium', cor)}>{rotulo}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Reveal>

      <Reveal className="flex flex-wrap items-end justify-between gap-2 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">OKRs · {trimestre}</h2>
          <p className="text-sm text-muted-foreground">
            {fmtPct(triPct)} do trimestre já passou. A linha de base é o CRM em {fmtDate(iniTri)}.
          </p>
        </div>
      </Reveal>

      {krs.map(({ o, resultados, media }) => (
        <Reveal key={o.id}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span className="num inline-flex h-7 items-center rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground">{o.codigo}</span>
                {o.titulo}
              </CardTitle>
              <CardAction className="text-sm text-muted-foreground">
                Progresso médio <span className="num font-medium text-foreground">{fmtPct(media)}</span>
              </CardAction>
            </CardHeader>
            <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
              {resultados.map(({ kr, atual, base, prog, status }, i) => (
                <div key={kr.id} className="flex flex-col gap-3 rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm leading-snug font-medium">{kr.nome}</span>
                    <Badge variant="outline" className={cn('shrink-0', STATUS[status].badge)}>
                      {STATUS[status].rotulo}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="num text-2xl font-semibold tracking-tight">{fmtValor(atual, kr.unidade)}</span>
                    <span className="text-xs text-muted-foreground">alvo {fmtValor(kr.alvo, kr.unidade)}</span>
                  </div>
                  <GrowBar pct={prog} color={STATUS[status].cor} delay={0.15 + i * 0.06} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Linha de base {fmtValor(base, kr.unidade)}</span>
                    <span>{prog === null ? '—' : `${fmtPct(prog)} do caminho`}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      ))}

      <p className="text-xs text-muted-foreground">Os alvos são exemplos até a supervisão fechar a linha de base de 30 dias. Eles podem ser editados em Configurações.</p>
    </Page>
  );
}
