import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dot, fmtPct, NameAvatar, PageHeader, Strong } from '@/components/kit';
import { AnimatedNumber, EASE, GrowBar, Page, Reveal, SPRING, Segmented } from '@/components/motion';
import { carteira, fechamento, mapaAtividade, metasDoMes, resumoAtendimento, resumoDemos } from '@/data/metrics/indicadores';
import { DAY, fmtMinutes } from '@/data/time';
import { cn } from '@/lib/utils';
import { usePainel } from '@/state/painel';

type Ordem = 'sla' | 'conv' | 'parados';

interface Linha {
  id: string;
  nome: string;
  rec: number;
  carteira: number;
  parados: number;
  sla: number | null;
  med: number | null;
  comp: number | null;
  conv: number | null;
  ganhosMes: number;
  meta: number;
  wpp: number | null;
  retro: number | null;
  status: 'atencao' | 'abaixo' | 'ok';
}

const STATUS = {
  atencao: { rotulo: 'Precisa de atenção', cor: 'var(--primary)', cls: 'text-primary' },
  abaixo: { rotulo: 'Abaixo do esperado', cor: 'var(--warning)', cls: 'text-warning-foreground' },
  ok: { rotulo: 'Dentro do processo', cor: 'var(--success)', cls: 'text-muted-foreground' },
};

function statusDe(sla: number | null, parados: number): Linha['status'] {
  if ((sla ?? 0) < 50 || parados >= 2) return 'atencao';
  if ((sla ?? 0) < 70 || parados > 0) return 'abaixo';
  return 'ok';
}

export function Performance() {
  const { ds, views, agora, config, vendedores, metas } = usePainel();
  const p = config.params;
  const [ordem, setOrdem] = useState<Ordem>('sla');
  const [sel, setSel] = useState<string | null>(null);

  const { linhas, time } = useMemo(() => {
    const ini = agora - 30 * DAY;
    const mes = metasDoMes(views, agora, p, metas, vendedores.map((v) => v.id));
    const linhas: Linha[] = vendedores.map((u) => {
      const r = resumoAtendimento(views, ds, p, ini, agora, u.id);
      const c = carteira(views, agora, p, u.id);
      const f = fechamento(views, ini, agora, u.id);
      const dm = resumoDemos(views, agora, ini, agora, u.id);
      return {
        id: u.id,
        nome: u.nome,
        rec: r.recebidos,
        carteira: c.abertos,
        parados: c.parados,
        sla: r.slaPct,
        med: r.medianaPrimeiroContatoMin,
        comp: dm.comparecimentoPct,
        conv: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null,
        ganhosMes: mes.porVendedor.find((x) => x.id === u.id)?.ganhos ?? 0,
        meta: metas[u.id] ?? 0,
        wpp: r.usoWhatsappCrmPct,
        retro: r.retroativosPct,
        status: statusDe(r.slaPct, c.parados),
      };
    });
    const r = resumoAtendimento(views, ds, p, ini, agora);
    const c = carteira(views, agora, p);
    const f = fechamento(views, ini, agora);
    const dm = resumoDemos(views, agora, ini, agora);
    return {
      linhas,
      time: {
        rec: r.recebidos,
        carteira: c.abertos,
        parados: c.parados,
        sla: r.slaPct,
        med: r.medianaPrimeiroContatoMin,
        comp: dm.comparecimentoPct,
        conv: r.recebidos ? (f.ganhos / r.recebidos) * 100 : null,
        ganhos: mes.ganhos,
        meta: mes.meta,
        wpp: r.usoWhatsappCrmPct,
      },
    };
  }, [ds, views, agora, p, vendedores, metas]);

  const ordenadas = [...linhas].sort((a, b) =>
    ordem === 'conv' ? (b.conv ?? 0) - (a.conv ?? 0) : ordem === 'parados' ? b.parados - a.parados || (a.sla ?? 0) - (b.sla ?? 0) : (b.sla ?? 0) - (a.sla ?? 0),
  );
  const pior = [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))[0];
  const det = linhas.find((l) => l.id === (sel ?? pior?.id)) ?? linhas[0];
  const m = useMemo(() => mapaAtividade(ds.interacoes, det.id, agora - 28 * DAY, agora), [ds, det.id, agora]);
  const maxM = Math.max(1, ...m.flat());
  const totalM = m.flat().reduce((a, b) => a + b, 0);
  const tardePct = totalM ? (m.reduce((s, dia) => s + dia[8] + dia[9], 0) / totalM) * 100 : 0;

  const criticos = linhas.filter((l) => (l.sla ?? 0) < 50);
  const paradosCriticos = criticos.reduce((s, l) => s + l.parados, 0);
  const convCriticos = criticos.length ? criticos.reduce((s, l) => s + (l.conv ?? 0), 0) / criticos.length : null;

  let insight: string;
  if (tardePct >= 35) insight = `${fmtPct(tardePct)} das interações são registradas depois das 16h, em bloco. Os leads da manhã esperam o dia todo pelo contato.`;
  else if ((det.retro ?? 0) >= 15) insight = `${fmtPct(det.retro)} das interações são registradas mais de 15 minutos depois do ocorrido. O contato acontece, mas o CRM fica para depois.`;
  else if ((det.wpp ?? 0) < 10) insight = `Quase não usa o WhatsApp do CRM (${fmtPct(det.wpp)}): cada mensagem precisa ser registrada à mão.`;
  else if (det.parados > 0) insight = `Bom ritmo de registros, mas ${det.parados} ${det.parados === 1 ? 'lead está parado' : 'leads estão parados'} há mais de ${p.paradoHoras}h.`;
  else insight = 'Registra ao longo do dia, logo depois de cada contato. É o padrão que o time deveria seguir.';

  // processo × resultado
  const xs = linhas.map((l) => l.sla ?? 0);
  const ys = linhas.map((l) => l.conv ?? 0);
  const x0 = Math.max(0, Math.floor((Math.min(...xs) - 8) / 10) * 10);
  const x1 = Math.min(100, Math.ceil((Math.max(...xs) + 8) / 10) * 10);
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - 4));
  const y1 = Math.ceil(Math.max(...ys) + 5);
  const px = (v: number) => ((v - x0) / (x1 - x0)) * 100;
  const py = (v: number) => ((v - y0) / (y1 - y0)) * 100;
  const mx = time.sla ?? 0;
  const my = time.conv ?? 0;
  const pontos: { l: Linha; dx: number }[] = [];
  for (const l of [...linhas].sort((a, b) => (a.sla ?? 0) - (b.sla ?? 0))) {
    const perto = pontos.filter((q) => Math.abs(px(q.l.sla ?? 0) - px(l.sla ?? 0)) < 6 && Math.abs(py(q.l.conv ?? 0) - py(l.conv ?? 0)) < 9);
    pontos.push({ l, dx: perto.length ? Math.max(...perto.map((q) => q.dx)) + 30 : 0 });
  }

  return (
    <Page>
      <PageHeader
        title="Performance por vendedor"
        description={
          criticos.length > 0 ? (
            <>
              Últimos 30 dias. <Strong tone="primary">{criticos.length === 1 ? '1 vendedor tem' : `${criticos.length} vendedores têm`}</Strong> menos de 50% de primeiro contato em
              até 1 hora; juntos somam {paradosCriticos} dos {time.parados} leads parados e convertem {fmtPct(convCriticos)}, contra {fmtPct(time.conv)} do time. Os números por pessoa
              são simulados.
            </>
          ) : (
            'Últimos 30 dias. Todos acima de 50% de primeiro contato em até 1 hora. Os números por pessoa são simulados.'
          )
        }
      />

      <Reveal>
        <Card className="gap-0 pb-0">
          <CardHeader className="pb-3">
            <CardTitle>Inside Sales · {linhas.length} vendedores</CardTitle>
            <CardDescription>Clique em um vendedor para ver o detalhe</CardDescription>
            <CardAction>
              <Segmented id="ordem" label="Ordenar por" value={ordem} onChange={setOrdem} options={[['sla', 'SLA'], ['conv', 'Conversão'], ['parados', 'Parados']]} />
            </CardAction>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Vendedor</TableHead>
                <TableHead className="text-right">Recebidos</TableHead>
                <TableHead className="text-right">Carteira</TableHead>
                <TableHead className="w-[18%]">1º contato em 1h</TableHead>
                <TableHead className="text-right">Mediana</TableHead>
                <TableHead className="text-right">Parados</TableHead>
                <TableHead className="text-right">Comparec.</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">No mês</TableHead>
                <TableHead className="pr-4 text-right">WhatsApp CRM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenadas.map((l, i) => {
                const ativo = l.id === det.id;
                return (
                  <motion.tr
                    key={l.id}
                    layout
                    transition={SPRING}
                    onClick={() => setSel(l.id)}
                    aria-selected={ativo}
                    className={cn('cursor-pointer border-b transition-colors hover:bg-muted/50', ativo && 'bg-muted/60')}
                  >
                    <td className="p-2 pl-4 align-middle">
                      <span className="flex items-center gap-2.5">
                        <span className="relative">
                          <NameAvatar nome={l.nome} size={30} />
                          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card" style={{ background: STATUS[l.status].cor }} />
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium">{l.nome}</span>
                          <span className={cn('text-xs', STATUS[l.status].cls)}>{STATUS[l.status].rotulo}</span>
                        </span>
                      </span>
                    </td>
                    <td className="num p-2 text-right align-middle">{l.rec}</td>
                    <td className="num p-2 text-right align-middle">{l.carteira}</td>
                    <td className="p-2 align-middle">
                      <div className="flex items-center gap-2">
                        <GrowBar pct={l.sla} color={(l.sla ?? 0) < 50 ? 'var(--primary)' : (l.sla ?? 0) < 70 ? 'var(--warning)' : 'var(--chart-5)'} delay={0.1 + i * 0.04} />
                        <span className={cn('num w-9 text-right', (l.sla ?? 0) < 50 && 'text-primary')}>{fmtPct(l.sla)}</span>
                      </div>
                    </td>
                    <td className={cn('num p-2 text-right align-middle whitespace-nowrap', (l.sla ?? 0) < 50 && 'text-primary')}>{l.med !== null ? fmtMinutes(l.med) : '—'}</td>
                    <td className={cn('num p-2 text-right align-middle font-medium', l.parados >= 2 ? 'text-primary' : l.parados === 1 ? 'text-warning-foreground' : 'text-muted-foreground')}>
                      {l.parados}
                    </td>
                    <td className="num p-2 text-right align-middle">{fmtPct(l.comp)}</td>
                    <td className="num p-2 text-right align-middle font-medium">{fmtPct(l.conv)}</td>
                    <td className="num p-2 text-right align-middle">
                      {l.ganhosMes}
                      <span className="text-muted-foreground">/{l.meta}</span>
                    </td>
                    <td className={cn('num p-2 pr-4 text-right align-middle', (l.wpp ?? 0) < 10 && 'text-primary')}>{fmtPct(l.wpp)}</td>
                  </motion.tr>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="pl-4 font-medium">Time</TableCell>
                <TableCell className="num text-right">{time.rec}</TableCell>
                <TableCell className="num text-right">{time.carteira}</TableCell>
                <TableCell className="num">{fmtPct(time.sla)}</TableCell>
                <TableCell className="num text-right">{time.med !== null ? fmtMinutes(time.med) : '—'}</TableCell>
                <TableCell className="num text-right">{time.parados}</TableCell>
                <TableCell className="num text-right">{fmtPct(time.comp)}</TableCell>
                <TableCell className="num text-right">{fmtPct(time.conv)}</TableCell>
                <TableCell className="num text-right">
                  {time.ganhos}/{time.meta}
                </TableCell>
                <TableCell className="num pr-4 text-right">{fmtPct(time.wpp)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <NameAvatar nome={det.nome} size={40} />
              <div className="flex flex-col">
                <CardTitle className="text-lg">{det.nome}</CardTitle>
                <CardDescription className={STATUS[det.status].cls}>{STATUS[det.status].rotulo}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <motion.div key={det.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="grid grid-cols-2 gap-3">
              {(
                [
                  ['1º contato em até 1h', det.sla, (v: number) => `${Math.round(v)}%`, `time: ${fmtPct(time.sla)}`, (det.sla ?? 0) < 50],
                  ['Mediana até o 1º contato', det.med, (v: number) => fmtMinutes(v), `time: ${time.med !== null ? fmtMinutes(time.med) : '—'}`, (det.sla ?? 0) < 50],
                  ['Parados agora', det.parados, undefined, `carteira de ${det.carteira} leads`, det.parados >= 2],
                  ['Uso do WhatsApp do CRM', det.wpp, (v: number) => `${Math.round(v)}%`, `time: ${fmtPct(time.wpp)}`, (det.wpp ?? 0) < 10],
                ] as [string, number | null, ((v: number) => string) | undefined, string, boolean][]
              ).map(([rot, val, fmt, sub, ruim]) => (
                <div key={rot} className="flex flex-col gap-1 rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">{rot}</span>
                  <span className={cn('text-2xl font-semibold tracking-tight', ruim && 'text-primary')}>{val === null ? '—' : <AnimatedNumber value={val} format={fmt} />}</span>
                  <span className="text-xs text-muted-foreground">{sub}</span>
                </div>
              ))}
            </motion.div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Interações registradas por hora · 4 semanas</span>
                <span className="text-xs text-muted-foreground">mais forte = mais</span>
              </div>
              <div role="img" aria-label={`Mapa de interações de ${det.nome}`} className="grid grid-cols-[32px_repeat(10,minmax(0,1fr))] items-center gap-1">
                <span />
                {Array.from({ length: 10 }, (_, h) => (
                  <span key={h} className="text-center text-[10.5px] text-muted-foreground">
                    {8 + h}h
                  </span>
                ))}
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((dia, di) => (
                  <div key={dia} className="contents">
                    <span className="text-xs text-muted-foreground">{dia}</span>
                    {m[di].map((n, h) => (
                      <motion.span
                        key={`${det.id}-${di}-${h}`}
                        title={`${dia} ${8 + h}h: ${n} interações`}
                        className="h-6 rounded-[4px]"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: EASE, delay: (di * 10 + h) * 0.006 }}
                        style={{ background: n === 0 ? 'var(--muted)' : `color-mix(in oklch, var(--primary) ${Math.round(18 + (n / maxM) * 82)}%, var(--card))` }}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{insight}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processo × resultado</CardTitle>
            <CardDescription>Horizontal: 1º contato em até 1h. Vertical: conversão em cadastro (30 dias). Linhas na média do time.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative mt-1 mr-4 mb-6 ml-8 h-[320px] border-b border-l">
              <div aria-hidden="true" className="absolute inset-y-0 border-l border-dashed" style={{ left: `${px(mx)}%` }} />
              <div aria-hidden="true" className="absolute inset-x-0 border-t border-dashed" style={{ bottom: `${py(my)}%` }} />
              <div aria-hidden="true" className="absolute top-0 right-0 bg-primary/[0.05]" style={{ left: `${px(mx)}%`, bottom: `${py(my)}%` }} />
              {pontos.map(({ l, dx }) => {
                const ativo = l.id === det.id;
                return (
                  <motion.button
                    key={l.id}
                    type="button"
                    onClick={() => setSel(l.id)}
                    aria-label={`${l.nome}: ${fmtPct(l.sla)} no prazo, ${fmtPct(l.conv)} de conversão`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: ativo ? 1.12 : 1 }}
                    transition={SPRING}
                    className={cn('absolute flex size-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-card', ativo ? 'z-10' : 'z-0')}
                    style={{
                      left: `calc(${px(l.sla ?? 0)}% - 16px + ${dx}px)`,
                      bottom: `calc(${py(l.conv ?? 0)}% - 16px)`,
                      background: ativo ? 'var(--foreground)' : STATUS[l.status].cor,
                      color: ativo ? 'var(--background)' : 'white',
                    }}
                  >
                    {l.nome.slice(0, 2).toUpperCase()}
                  </motion.button>
                );
              })}
              <span className="absolute -top-1.5 -left-8 text-[11px] text-muted-foreground">{y1}%</span>
              <span className="absolute -bottom-1.5 -left-7 text-[11px] text-muted-foreground">{y0}%</span>
              <span className="absolute -bottom-6 left-0 text-[11px] text-muted-foreground">{x0}%</span>
              <span className="absolute right-0 -bottom-6 text-[11px] text-muted-foreground">{x1}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {(Object.keys(STATUS) as Linha['status'][]).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <Dot color={STATUS[k].cor} />
                  {STATUS[k].rotulo}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </Page>
  );
}
